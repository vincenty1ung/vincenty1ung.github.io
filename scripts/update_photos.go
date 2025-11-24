package scripts

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

// Configuration
const (
	ProjectRoot = "../" // Assuming script is run from scripts/ directory
	ImgDir      = "web/photography/gallery_images"
	OutputFile  = "web/photography/photos.json"

	// Path prefixes
	WebPhotographyPrefix = "web/photography/"

	// File extensions
	ExtJPG  = ".jpg"
	ExtJPEG = ".jpeg"
	ExtPNG  = ".png"
	ExtWebP = ".webp"

	// Date formats
	DateFormatYMD     = "%s-%s-%s"
	DateFormatDefault = "%s-01-01"
	DefaultMonth      = "01"
	DefaultDay        = "01"
)

// TODO: 后续会识别到照片之后，会增加功能，关于上传 R2 的这个内容服务器，然后自动上传照片到指定的目录，最后换回链接。最好是有能处理缩略图的功能。
// TODO: 目前是将照片拷贝到年份下，这属于新增的照片。然后会调用 `update_photos` 的这个函数，读取到目录下的所有照片，并检查照片是否有上传到 R2。
// TODO: 如果没有上传是一回事；如果有上传，则可以直接使用链接。如果没有上传，要先检查，检查后如果仍然没有上传，则会把当前的照片处理成一张缩略图。
// TODO: 然后将缩略图上传到指定目录下。最后，换回链接后，将换回的链接和照片一起保存 保存到 `photos.json` 的 JSON 文件中，供前端的 JS 识别使用。
// TODO: 目前只有缩略图是我手动上传到 R2 服务器。未来会使用到这个更新的脚本，更新的脚本会自动把目录里的原图上传到 R2 服务器，并且上传缩略图到 R2 服务器。
// TODO: 在 PhotoJSON 的文件中使用的都是 R2 服务器的图片地址，而不是用到仓库里的图片。后续会把仓库中的图片进行清理，而不使用仓库中的图片。@gallery_images 目录下的图片，不上传git仓库
// TODO: R2的配置在当前目录下的 `.env` 文件中。
// TODO: 接口文档:https://developers.cloudflare.com/r2/api/s3/api/

// Photo represents a single photo entry
type Photo struct {
	Filename  string                 `json:"filename"`
	Path      string                 `json:"path"`
	Thumbnail string                 `json:"thumbnail"`
	Alt       string                 `json:"alt"`
	Year      string                 `json:"year"`
	Month     string                 `json:"month"`
	Date      string                 `json:"date"` // YYYY-MM-DD for sorting
	Width     int                    `json:"width,omitempty"`
	Height    int                    `json:"height,omitempty"`
	Exif      map[string]interface{} `json:"exif,omitempty"` // Complete EXIF data from exiftool
}

// YearAlbum represents a collection of photos for a specific year
type YearAlbum struct {
	Year   string  `json:"year"`
	Photos []Photo `json:"photos"`
}

// ExifData represents the complete EXIF data returned by exiftool
// Using map to capture all fields dynamically
type ExifData map[string]interface{}

// extractDateFromExif uses exiftool to extract EXIF data from a photo
// Returns year, month, full date string (YYYY-MM-DD), and complete EXIF data
func extractDateFromExif(filePath string) (
	year, month, dateStr string, imageWidth, imageHeight int, exifData ExifData, err error,
) {
	// Run exiftool -json <filepath>
	cmd := exec.Command("exiftool", "-json", filePath)
	output, err := cmd.Output()
	if err != nil {
		return "", "", "", 0, 0, nil, fmt.Errorf("exiftool command failed: %w", err)
	}

	// Parse JSON output
	var exifDataArray []ExifData
	if err := json.Unmarshal(output, &exifDataArray); err != nil {
		return "", "", "", 0, 0, nil, fmt.Errorf("failed to parse exiftool JSON: %w", err)
	}

	if len(exifDataArray) == 0 {
		return "", "", "", 0, 0, nil, fmt.Errorf("no EXIF data found")
	}

	exifData = exifDataArray[0]

	// Try DateTimeOriginal first, fallback to CreateDate
	var dateTimeStr string
	if val, ok := exifData["DateTimeOriginal"].(string); ok && val != "" {
		dateTimeStr = val
	} else if val, ok := exifData["CreateDate"].(string); ok && val != "" {
		dateTimeStr = val
	}

	if val, ok := exifData["ImageWidth"].(float64); ok && val > 0 {
		imageWidth = int(val)
	} else if val, ok := exifData["ExifImageWidth"].(float64); ok && val > 0 {
		imageWidth = int(val)
	}
	if val, ok := exifData["ImageHeight"].(float64); ok && val > 0 {
		imageHeight = int(val)
	} else if val, ok := exifData["ExifImageHeight"].(float64); ok && val > 0 {
		imageHeight = int(val)
	}

	if dateTimeStr == "" {
		return "", "", "", 0, 0, exifData, fmt.Errorf("no date information in EXIF")
	}

	// Parse the date string (format: "2025:11:02 13:22:57")
	// Try multiple formats
	var parsedTime time.Time
	formats := []string{
		"2006:01:02 15:04:05",
		"2006:01:02",
	}

	for _, format := range formats {
		parsedTime, err = time.Parse(format, dateTimeStr)
		if err == nil {
			break
		}
	}

	if err != nil {
		return "", "", "", 0, 0, exifData, fmt.Errorf("failed to parse date '%s': %w", dateTimeStr, err)
	}

	year = fmt.Sprintf("%04d", parsedTime.Year())
	month = fmt.Sprintf("%02d", parsedTime.Month())
	dateStr = parsedTime.Format("2006-01-02")

	return year, month, dateStr, imageWidth, imageHeight, exifData, nil
}
func UpdatePhotosHandler() {
	rootDir, err := os.Getwd()
	if err != nil {
		fmt.Printf("Error getting current working directory: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Current working directory: %s\n", rootDir)

	// Initialize R2 client
	var r2Client *R2Client
	var thumbnailBase string

	r2Config, err := LoadR2Config()
	if err != nil {
		fmt.Printf("⚠ Warning: R2 configuration load failed: %v\n", err)
		fmt.Println("Using default/empty configuration...")
		// Set default or empty values if config load fails
		thumbnailBase = ""
	} else {
		// Construct thumbnail base URL from config
		thumbnailBase = fmt.Sprintf(
			"%s/%s%s",
			strings.TrimRight(r2Config.CDNUrl, "/"),
			r2Config.BasePrefix,
			r2Config.ThumbnailPrefix,
		)

		fmt.Printf("✓ Configuration loaded. Thumbnail base: %s\n", thumbnailBase)

		r2Client, err = NewR2Client(r2Config)
		if err != nil {
			fmt.Printf("⚠ Warning: Failed to create R2 client (expected if no credentials): %v\n", err)
			fmt.Println("Continuing without R2 upload...")
		} else {
			fmt.Println("✓ R2 client initialized successfully")
		}
	}

	imgDirPath := filepath.Join(rootDir, ImgDir)
	outputFilePath := filepath.Join(rootDir, OutputFile)

	// 1. Read existing photos.json to preserve metadata and identify files to delete
	existingAlbums := make(map[string]map[string]Photo)
	var existingAllPhotos []Photo // Keep track of all existing photos for deletion comparison
	if _, err := os.Stat(outputFilePath); err == nil {
		// Create backup of existing photos.json
		content, err := os.ReadFile(outputFilePath)
		if err == nil {
			backupPath := outputFilePath + "." + time.Now().Format("20060102_150405") + ".bak"
			if err := os.WriteFile(backupPath, content, 0644); err != nil {
				fmt.Printf("Warning: Could not create backup of %s: %v\n", outputFilePath, err)
			} else {
				fmt.Printf("✓ Backup created: %s\n", backupPath)
			}

			var albums []YearAlbum
			if err := json.Unmarshal(content, &albums); err == nil {
				for _, album := range albums {
					if existingAlbums[album.Year] == nil {
						existingAlbums[album.Year] = make(map[string]Photo)
					}
					for _, p := range album.Photos {
						existingAlbums[album.Year][p.Filename] = p
						existingAllPhotos = append(existingAllPhotos, p)
					}
				}
				fmt.Printf(
					"Loaded existing metadata for %d years with %d total photos.\n", len(albums),
					len(existingAllPhotos),
				)
			}
		}
	}

	// Regex to parse date from filename: DSC_YYYY-MM-DD_...
	dateRegex := regexp.MustCompile(`DSC_(\d{4})-(\d{2})-(\d{2})`)

	// 2. Scan directories
	var newAlbums []YearAlbum

	entries, err := os.ReadDir(imgDirPath)
	if err != nil {
		// If directory doesn't exist, try to create it or just warn
		fmt.Printf("Error reading image directory %s: %v\n", imgDirPath, err)
		os.Exit(1)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		year := entry.Name()
		yearDir := filepath.Join(imgDirPath, year)

		var photos []Photo

		// Walk the year directory
		err := filepath.WalkDir(
			yearDir, func(path string, d fs.DirEntry, err error) error {
				if err != nil {
					return err
				}
				if d.IsDir() {
					return nil
				}

				// Filter for image files
				ext := strings.ToLower(filepath.Ext(d.Name()))
				if ext != ExtJPG && ext != ExtJPEG && ext != ExtPNG && ext != ExtWebP {
					return nil
				}

				filename := d.Name()
				relPath, _ := filepath.Rel(rootDir, path)
				webPath := strings.ReplaceAll(relPath, "\\", "/")

				// Fix path to be relative to web/photography/index.html
				// Current webPath: web/photography/gallery_images/2025/xxx.jpg
				// Desired: gallery_images/2025/xxx.jpg
				if after, ok :=strings.CutPrefix(webPath, WebPhotographyPrefix); ok  {
					webPath = after
				}

				// Generate filename without extension for R2 keys
				filenameNoExt := strings.TrimSuffix(filename, filepath.Ext(filename))

				// R2 Upload Logic
				var finalPath, finalThumbnail string

				if r2Client != nil {
					// 1. Check and upload original image
					originalKey := fmt.Sprintf(
						"%s%s%s", r2Client.config.BasePrefix, r2Client.config.OriginalPrefix, filename,
					)
					if !r2Client.CheckFileExists(originalKey) {
						if err := r2Client.UploadFile(path, originalKey); err != nil {
							fmt.Printf("❌ Failed to upload original %s: %v\n", filename, err)
							// Fallback to local path
							finalPath = webPath
						} else {
							fmt.Printf("✓ Uploaded original: %s\n", filename)
							finalPath = r2Client.GetCDNUrl(originalKey)
						}
					} else {
						fmt.Printf("→ Original already exists: %s\n", filename)
						finalPath = r2Client.GetCDNUrl(originalKey)
					}

					// 2. Check and upload thumbnail
					thumbnailKey := fmt.Sprintf(
						"%s%s%s%s", r2Client.config.BasePrefix, r2Client.config.ThumbnailPrefix, filenameNoExt, ExtWebP,
					)
					if !r2Client.CheckFileExists(thumbnailKey) {
						// Generate thumbnail
						thumbnailData, err := GenerateThumbnail(path, DefaultThumbnailConfig())
						if err != nil {
							fmt.Printf("❌ Failed to generate thumbnail for %s: %v\n", filename, err)
							// Fallback to default thumbnail URL
							finalThumbnail = thumbnailBase + filenameNoExt + ".webp"
						} else {
							// Upload thumbnail
							if err := r2Client.UploadBytes(thumbnailData, thumbnailKey, "image/webp"); err != nil {
								fmt.Printf("❌ Failed to upload thumbnail for %s: %v\n", filename, err)
								finalThumbnail = thumbnailBase + filenameNoExt + ".webp"
							} else {
								fmt.Printf("✓ Generated and uploaded thumbnail: %s\n", filename)
								finalThumbnail = r2Client.GetCDNUrl(thumbnailKey)
							}
						}
					} else {
						fmt.Printf("→ Thumbnail already exists: %s\n", filename)
						finalThumbnail = r2Client.GetCDNUrl(thumbnailKey)
					}
				} else {
					// No R2 client, use local paths
					finalPath = webPath
					finalThumbnail = thumbnailBase + filenameNoExt + ".webp"
				}

				// Parse Date - Try EXIF first, fallback to filename
				var month, dateStr string
				var photoYear string
				var photoExif ExifData

				// Try to extract date from EXIF
				exifYear, exifMonth, exifDateStr, imageWidth, imageHeight, exifData, err := extractDateFromExif(path)
				if err == nil {
					// Successfully extracted from EXIF
					photoYear = exifYear
					month = exifMonth
					dateStr = exifDateStr
					photoExif = exifData
					fmt.Printf("✓ EXIF date for %s: %s\n", filename, dateStr)
				} else {
					// Fallback to filename parsing
					fmt.Printf("⚠ EXIF failed for %s (%v), trying filename...\n", filename, err)
					matches := dateRegex.FindStringSubmatch(filename)
					if len(matches) >= 4 {
						// matches[1] is Year, matches[2] is Month, matches[3] is Day
						photoYear = matches[1]
						month = matches[2]
						dateStr = fmt.Sprintf(DateFormatYMD, matches[1], matches[2], matches[3])
						fmt.Printf("✓ Filename date for %s: %s\n", filename, dateStr)
					} else {
						// Last resort: use directory year and default values
						photoYear = year
						month = DefaultMonth
						dateStr = fmt.Sprintf(DateFormatDefault, year)
						fmt.Printf("⚠ No date found for %s, using default: %s\n", filename, dateStr)
					}
				}

				photo := Photo{
					Filename:  filename,
					Path:      finalPath,
					Thumbnail: finalThumbnail,
					Alt:       "",
					Year:      photoYear,
					Month:     month,
					Date:      dateStr,
					Width:     imageWidth,
					Height:    imageHeight,
					Exif:      photoExif,
				}

				// Preserve existing metadata
				if existingYear, ok := existingAlbums[year]; ok {
					if existingPhoto, ok := existingYear[filename]; ok {
						photo.Alt = existingPhoto.Alt
						// photo.Width = existingPhoto.Width
						// photo.Height = existingPhoto.Height
					}
				}

				photos = append(photos, photo)
				return nil
			},
		)

		if err != nil {
			fmt.Printf("Error walking directory %s: %v\n", yearDir, err)
			continue
		}

		// Sort photos by Date Descending
		sort.Slice(
			photos, func(i, j int) bool {
				return photos[i].Date > photos[j].Date
			},
		)

		if len(photos) > 0 {
			newAlbums = append(
				newAlbums, YearAlbum{
					Year:   year,
					Photos: photos,
				},
			)
		}
	}

	// Sort albums by year descending
	sort.Slice(
		newAlbums, func(i, j int) bool {
			return newAlbums[i].Year > newAlbums[j].Year
		},
	)

	// 3. Write to photos.json
	// Filter EXIF data to reduce file size
	// Whitelist of keys used in gallery.js
	allowedExifKeys := map[string]bool{
		// Rating & Tags
		"Rating": true, "Keywords": true, "Subject": true,
		// Shooting Params
		"FocalLength": true, "FNumber": true, "Aperture": true, "ExposureTime": true, "ShutterSpeed": true, "ISO": true,
		// Device Info
		"Make": true, "Model": true, "LensModel": true, "Lens": true, "FocalLengthIn35mmFormat": true,
		// Shooting Mode
		"WhiteBalance": true, "ExposureProgram": true, "ExposureMode": true, "MeteringMode": true, "Flash": true,
		"SceneCaptureType": true,
		// Date (for reference/debugging if needed, though we parse it separately)
		"DateTimeOriginal": true, "CreateDate": true, "OffsetTimeOriginal": true, "OffsetTime": true,
	}

	for i := range newAlbums {
		for j := range newAlbums[i].Photos {
			if newAlbums[i].Photos[j].Exif != nil {
				filteredExif := make(map[string]interface{})
				for k, v := range newAlbums[i].Photos[j].Exif {
					if allowedExifKeys[k] {
						filteredExif[k] = v
					}
				}
				newAlbums[i].Photos[j].Exif = filteredExif
			}
		}
	}

	// Find photos to delete by comparing existing photos with new photos
	var photosToDelete []Photo
	if len(existingAllPhotos) > 0 {
		// Create a map of new photos for quick lookup
		newPhotosMap := make(map[string]bool)
		for _, album := range newAlbums {
			for _, photo := range album.Photos {
				newPhotosMap[photo.Filename] = true
			}
		}

		// Find photos that exist in old list but not in new list
		for _, existingPhoto := range existingAllPhotos {
			if !newPhotosMap[existingPhoto.Filename] {
				photosToDelete = append(photosToDelete, existingPhoto)
			}
		}
	}

	// Delete photos from R2 if R2 client is available
	if r2Client != nil && len(photosToDelete) > 0 {
		fmt.Printf("Deleting %d photos from R2...\n", len(photosToDelete))
		for _, photo := range photosToDelete {
			// Extract filename without extension for generating R2 keys
			filenameWithoutExt := strings.TrimSuffix(photo.Filename, filepath.Ext(photo.Filename))

			// Delete original photo from R2
			originalKey := fmt.Sprintf(
				"%s%s%s", r2Client.config.BasePrefix, r2Client.config.OriginalPrefix, photo.Filename,
			)
			if err := r2Client.DeleteObject(originalKey); err != nil {
				fmt.Printf("⚠️  Failed to delete original from R2: %s (%v)\n", photo.Filename, err)
			} else {
				fmt.Printf("✓ Deleted original from R2: %s\n", originalKey)
			}

			// Delete thumbnail from R2
			thumbnailKey := fmt.Sprintf(
				"%s%s%s%s", r2Client.config.BasePrefix, r2Client.config.ThumbnailPrefix, filenameWithoutExt, ExtWebP,
			)
			if err := r2Client.DeleteObject(thumbnailKey); err != nil {
				fmt.Printf("⚠️  Failed to delete thumbnail from R2: %s (%v)\n", thumbnailKey, err)
			} else {
				fmt.Printf("✓ Deleted thumbnail from R2: %s\n", thumbnailKey)
			}
		}
	} else if len(photosToDelete) > 0 {
		fmt.Printf("Found %d photos to delete, but R2 client not available.\n", len(photosToDelete))
	} else {
		fmt.Printf("No photos to delete from R2.\n")
	}

	// Use Marshal instead of MarshalIndent for minified output
	jsonData, err := json.Marshal(newAlbums)
	if err != nil {
		fmt.Printf("Error marshaling JSON: %v\n", err)
		os.Exit(1)
	}

	err = os.WriteFile(outputFilePath, jsonData, 0644)
	if err != nil {
		fmt.Printf("Error writing to %s: %v\n", outputFilePath, err)
		os.Exit(1)
	}

	totalPhotos := 0
	for _, album := range newAlbums {
		totalPhotos += len(album.Photos)
	}
	fmt.Printf(
		"Successfully generated %s with %d years and %d total photos.\n", outputFilePath, len(newAlbums), totalPhotos,
	)
}
