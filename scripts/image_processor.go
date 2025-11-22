package scripts

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	"os"

	"github.com/chai2010/webp"
	"golang.org/x/image/draw"
)

// ThumbnailConfig holds configuration for thumbnail generation
type ThumbnailConfig struct {
	MaxWidth int
	Quality  int // 1-100 for JPEG/WebP
}

// DefaultThumbnailConfig returns the default thumbnail configuration
func DefaultThumbnailConfig() ThumbnailConfig {
	return ThumbnailConfig{
		MaxWidth: 800,
		Quality:  85,
	}
}

// GenerateThumbnail generates a WebP thumbnail from an image file
func GenerateThumbnail(imagePath string, config ThumbnailConfig) ([]byte, error) {
	// Read the image file
	file, err := os.Open(imagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open image: %w", err)
	}
	defer file.Close()

	// Decode the image
	img, _, err := image.Decode(file)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	// Get original dimensions
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// Calculate new dimensions maintaining aspect ratio
	newWidth := config.MaxWidth
	newHeight := height * newWidth / width

	// If image is already smaller, don't upscale
	if width <= config.MaxWidth {
		newWidth = width
		newHeight = height
	}

	// Create a new image with the target dimensions
	dst := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))

	// Resize using high-quality interpolation
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, img.Bounds(), draw.Over, nil)

	// Encode to WebP
	var buf bytes.Buffer

	// WebP encoding options
	options := &webp.Options{
		Lossless: false,
		Quality:  float32(config.Quality),
	}

	err = webp.Encode(&buf, dst, options)
	if err != nil {
		return nil, fmt.Errorf("failed to encode WebP thumbnail: %w", err)
	}

	return buf.Bytes(), nil
}

// GenerateThumbnailJPEG generates a JPEG thumbnail (fallback option)
func GenerateThumbnailJPEG(imagePath string, config ThumbnailConfig) ([]byte, error) {
	// Read the image file
	file, err := os.Open(imagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open image: %w", err)
	}
	defer file.Close()

	// Decode the image
	img, _, err := image.Decode(file)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	// Get original dimensions
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// Calculate new dimensions maintaining aspect ratio
	newWidth := config.MaxWidth
	newHeight := height * newWidth / width

	// If image is already smaller, don't upscale
	if width <= config.MaxWidth {
		newWidth = width
		newHeight = height
	}

	// Create a new image with the target dimensions
	dst := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))

	// Resize using high-quality interpolation
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, img.Bounds(), draw.Over, nil)

	// Encode to JPEG
	var buf bytes.Buffer
	err = jpeg.Encode(&buf, dst, &jpeg.Options{Quality: config.Quality})
	if err != nil {
		return nil, fmt.Errorf("failed to encode JPEG thumbnail: %w", err)
	}

	return buf.Bytes(), nil
}
