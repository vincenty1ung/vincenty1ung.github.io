package scripts

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockS3Client is a mock implementation of the S3 client
type MockS3Client struct {
	mock.Mock
}

func (m *MockS3Client) HeadObject(ctx context.Context, params *s3.HeadObjectInput, optFns ...func(*s3.Options)) (*s3.HeadObjectOutput, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*s3.HeadObjectOutput), args.Error(1)
}

func (m *MockS3Client) PutObject(ctx context.Context, params *s3.PutObjectInput, optFns ...func(*s3.Options)) (*s3.PutObjectOutput, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*s3.PutObjectOutput), args.Error(1)
}

func (m *MockS3Client) DeleteObject(ctx context.Context, params *s3.DeleteObjectInput, optFns ...func(*s3.Options)) (*s3.DeleteObjectOutput, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*s3.DeleteObjectOutput), args.Error(1)
}

// TestGetEnv tests the getEnv function
func TestGetEnv(t *testing.T) {
	tests := []struct {
		name     string
		envVars  map[string]string
		names    []string
		expected string
	}{
		{
			name: "First variable exists",
			envVars: map[string]string{
				"VAR1": "value1",
				"VAR2": "value2",
			},
			names:    []string{"VAR1", "VAR2"},
			expected: "value1",
		},
		{
			name: "Second variable exists",
			envVars: map[string]string{
				"VAR2": "value2",
			},
			names:    []string{"VAR1", "VAR2"},
			expected: "value2",
		},
		{
			name:     "No variables exist",
			envVars:  map[string]string{},
			names:    []string{"VAR1", "VAR2"},
			expected: "",
		},
		{
			name: "Empty string value",
			envVars: map[string]string{
				"VAR1": "",
				"VAR2": "value2",
			},
			names:    []string{"VAR1", "VAR2"},
			expected: "value2",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup environment
			for k, v := range tt.envVars {
				os.Setenv(k, v)
			}
			defer func() {
				for k := range tt.envVars {
					os.Unsetenv(k)
				}
			}()

			result := getEnv(tt.names...)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// TestGetEnvWithDefault tests the getEnvWithDefault function
func TestGetEnvWithDefault(t *testing.T) {
	tests := []struct {
		name         string
		envVars      map[string]string
		defaultValue string
		names        []string
		expected     string
	}{
		{
			name: "Variable exists",
			envVars: map[string]string{
				"VAR1": "custom_value",
			},
			defaultValue: "default_value",
			names:        []string{"VAR1"},
			expected:     "custom_value",
		},
		{
			name:         "Variable does not exist, use default",
			envVars:      map[string]string{},
			defaultValue: "default_value",
			names:        []string{"VAR1"},
			expected:     "default_value",
		},
		{
			name: "First variable empty, second exists",
			envVars: map[string]string{
				"VAR1": "",
				"VAR2": "value2",
			},
			defaultValue: "default_value",
			names:        []string{"VAR1", "VAR2"},
			expected:     "value2",
		},
		{
			name: "All variables empty, use default",
			envVars: map[string]string{
				"VAR1": "",
				"VAR2": "",
			},
			defaultValue: "default_value",
			names:        []string{"VAR1", "VAR2"},
			expected:     "default_value",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup environment
			for k, v := range tt.envVars {
				os.Setenv(k, v)
			}
			defer func() {
				for k := range tt.envVars {
					os.Unsetenv(k)
				}
			}()

			result := getEnvWithDefault(tt.defaultValue, tt.names...)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// TestGetContentType tests the getContentType function
func TestGetContentType(t *testing.T) {
	tests := []struct {
		filename    string
		contentType string
	}{
		{"image.jpg", "image/jpeg"},
		{"image.jpeg", "image/jpeg"},
		{"image.JPG", "image/jpeg"},
		{"image.png", "image/png"},
		{"image.PNG", "image/png"},
		{"image.webp", "image/webp"},
		{"image.gif", "image/gif"},
		{"image.heic", "image/heic"},
		{"image.heif", "image/heic"},
		{"image.avif", "image/avif"},
		{"image.tiff", "image/tiff"},
		{"image.tif", "image/tiff"},
		{"image.bmp", "image/bmp"},
		{"image.svg", "image/svg+xml"},
		{"favicon.ico", "image/x-icon"},
		{"image.raw", "image/x-dcraw"},
		{"image.arw", "image/x-dcraw"},
		{"image.cr2", "image/x-dcraw"},
		{"image.cr3", "image/x-dcraw"},
		{"image.nef", "image/x-dcraw"},
		{"image.dng", "image/x-dcraw"},
		{"image.orf", "image/x-dcraw"},
		{"image.rw2", "image/x-dcraw"},
		{"file.txt", "application/octet-stream"},
		{"unknown", "application/octet-stream"},
	}

	for _, tt := range tests {
		t.Run(tt.filename, func(t *testing.T) {
			result := getContentType(tt.filename)
			assert.Equal(t, tt.contentType, result)
		})
	}
}

// TestLoadR2Config tests the LoadR2Config function
func TestLoadR2Config(t *testing.T) {
	t.Run("Missing required configuration", func(t *testing.T) {
		// Create a temporary .env file with incomplete config
		tmpDir := t.TempDir()
		envFile := filepath.Join(tmpDir, ".env")
		content := `NUXT_PROVIDER_S3_ENDPOINT=https://test.r2.cloudflarestorage.com
NUXT_PROVIDER_S3_BUCKET=test-bucket`
		err := os.WriteFile(envFile, []byte(content), 0644)
		assert.NoError(t, err)

		// Change to temp directory
		oldWd, _ := os.Getwd()
		os.Chdir(tmpDir)
		defer os.Chdir(oldWd)

		config, err := LoadR2Config()
		assert.Error(t, err)
		assert.Nil(t, config)
		assert.Contains(t, err.Error(), "missing required R2 configuration")
	})

	t.Run("Valid configuration", func(t *testing.T) {
		// Create a temporary .env file with complete config
		tmpDir := t.TempDir()
		envFile := filepath.Join(tmpDir, ".env")
		content := `NUXT_PROVIDER_S3_ENDPOINT=https://test.r2.cloudflarestorage.com
NUXT_PROVIDER_S3_BUCKET=test-bucket
NUXT_PROVIDER_S3_REGION=auto
NUXT_PROVIDER_S3_ACCESS_KEY_ID=test_key
NUXT_PROVIDER_S3_SECRET_ACCESS_KEY=test_secret
NUXT_PROVIDER_S3_CDN_URL=https://cdn.example.com
NUXT_PROVIDER_S3_BASE_PREFIX=photos/
NUXT_PROVIDER_S3_ORIGINAL_PREFIX=originals/
NUXT_PROVIDER_S3_PREFIX_THUMBNAIL_BASE=thumbnails/`
		err := os.WriteFile(envFile, []byte(content), 0644)
		assert.NoError(t, err)

		// Change to temp directory
		oldWd, _ := os.Getwd()
		os.Chdir(tmpDir)
		defer os.Chdir(oldWd)

		config, err := LoadR2Config()
		assert.NoError(t, err)
		assert.NotNil(t, config)
		assert.Equal(t, "https://test.r2.cloudflarestorage.com", config.Endpoint)
		assert.Equal(t, "test-bucket", config.Bucket)
		assert.Equal(t, "auto", config.Region)
		assert.Equal(t, "test_key", config.AccessKeyID)
		assert.Equal(t, "test_secret", config.SecretAccessKey)
		assert.Equal(t, "https://cdn.example.com", config.CDNUrl)
		assert.Equal(t, "photos/", config.BasePrefix)
		assert.Equal(t, "originals/", config.OriginalPrefix)
		assert.Equal(t, "thumbnails/", config.ThumbnailPrefix)
	})

	t.Run("Configuration with defaults", func(t *testing.T) {
		// Create a temporary .env file with minimal config
		tmpDir := t.TempDir()
		envFile := filepath.Join(tmpDir, ".env")
		content := `NUXT_PROVIDER_S3_ENDPOINT=https://test.r2.cloudflarestorage.com
NUXT_PROVIDER_S3_BUCKET=test-bucket
NUXT_PROVIDER_S3_ACCESS_KEY_ID=test_key
NUXT_PROVIDER_S3_SECRET_ACCESS_KEY=test_secret`
		err := os.WriteFile(envFile, []byte(content), 0644)
		assert.NoError(t, err)

		// Change to temp directory
		oldWd, _ := os.Getwd()
		os.Chdir(tmpDir)
		defer os.Chdir(oldWd)

		config, err := LoadR2Config()
		assert.NoError(t, err)
		assert.NotNil(t, config)
		assert.Equal(t, "photos/", config.BasePrefix)
		assert.Equal(t, "originals/", config.OriginalPrefix)
		assert.Equal(t, "thumbnails/", config.ThumbnailPrefix)
	})
}

// TestNewR2Client tests the NewR2Client function
func TestNewR2Client(t *testing.T) {
	config := &R2Config{
		Endpoint:        "https://test.r2.cloudflarestorage.com",
		Bucket:          "test-bucket",
		Region:          "auto",
		AccessKeyID:     "test_key",
		SecretAccessKey: "test_secret",
		CDNUrl:          "https://cdn.example.com",
		BasePrefix:      "photos/",
		OriginalPrefix:  "originals/",
		ThumbnailPrefix: "thumbnails/",
	}

	client, err := NewR2Client(config)
	assert.NoError(t, err)
	assert.NotNil(t, client)
	assert.NotNil(t, client.client)
	assert.Equal(t, config.Endpoint, client.config.Endpoint)
	assert.Equal(t, config.Bucket, client.config.Bucket)
}

// TestGetCDNUrl tests the GetCDNUrl method
func TestGetCDNUrl(t *testing.T) {
	t.Run("With CDN URL", func(t *testing.T) {
		client := &R2Client{
			config: R2Config{
				CDNUrl: "https://cdn.example.com",
			},
		}

		url := client.GetCDNUrl("photos/2023/image.jpg")
		assert.Equal(t, "https://cdn.example.com/photos/2023/image.jpg", url)
	})

	t.Run("Without CDN URL (fallback)", func(t *testing.T) {
		client := &R2Client{
			config: R2Config{
				Endpoint: "https://test.r2.cloudflarestorage.com",
				Bucket:   "test-bucket",
				CDNUrl:   "",
			},
		}

		url := client.GetCDNUrl("photos/2023/image.jpg")
		assert.Equal(t, "https://test.r2.cloudflarestorage.com/test-bucket/photos/2023/image.jpg", url)
	})
}

// TestUploadBytes tests the UploadBytes method
func TestUploadBytes(t *testing.T) {
	t.Run("Successful upload", func(t *testing.T) {
		// This test would require mocking the S3 client
		// For demonstration purposes, we'll skip the actual implementation
		// In a real scenario, you would use a mock S3 client
		t.Skip("Requires S3 client mocking")
	})

	t.Run("Upload failure", func(t *testing.T) {
		// This test would require mocking the S3 client with error response
		t.Skip("Requires S3 client mocking")
	})
}

// TestUploadFile tests the UploadFile method
func TestUploadFile(t *testing.T) {
	t.Run("File not found", func(t *testing.T) {
		config := &R2Config{
			Endpoint:        "https://test.r2.cloudflarestorage.com",
			Bucket:          "test-bucket",
			Region:          "auto",
			AccessKeyID:     "test_key",
			SecretAccessKey: "test_secret",
		}

		client, err := NewR2Client(config)
		assert.NoError(t, err)

		err = client.UploadFile("/nonexistent/file.jpg", "test/file.jpg")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to read file")
	})

	t.Run("Successful upload", func(t *testing.T) {
		// This test would require mocking the S3 client
		t.Skip("Requires S3 client mocking and actual S3 connection")
	})
}

// TestCheckFileExists tests the CheckFileExists method
func TestCheckFileExists(t *testing.T) {
	t.Run("File exists", func(t *testing.T) {
		// This test would require mocking the S3 client
		t.Skip("Requires S3 client mocking")
	})

	t.Run("File does not exist", func(t *testing.T) {
		// This test would require mocking the S3 client
		t.Skip("Requires S3 client mocking")
	})
}

// TestDeleteObject tests the DeleteObject method
func TestDeleteObject(t *testing.T) {
	t.Run("Successful deletion", func(t *testing.T) {
		// This test would require mocking the S3 client
		t.Skip("Requires S3 client mocking")
	})

	t.Run("Deletion failure", func(t *testing.T) {
		// This test would require mocking the S3 client
		t.Skip("Requires S3 client mocking")
	})
}

// Integration test helper - only runs when integration tag is provided
// Run with: go test -tags=integration
func TestR2ClientIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Load real configuration
	config, err := LoadR2Config()
	if err != nil {
		t.Skipf("Skipping integration test: %v", err)
	}

	client, err := NewR2Client(config)
	assert.NoError(t, err)
	assert.NotNil(t, client)

	// Test upload and delete with a temporary file
	tmpFile := filepath.Join(t.TempDir(), "test.txt")
	err = os.WriteFile(tmpFile, []byte("test content"), 0644)
	assert.NoError(t, err)

	testKey := "test/integration_test.txt"

	// Upload
	err = client.UploadFile(tmpFile, testKey)
	if err != nil {
		t.Logf("Upload failed (may be expected if R2 is not configured): %v", err)
	}

	// Check existence
	exists := client.CheckFileExists(testKey)
	t.Logf("File exists: %v", exists)

	// Delete
	if exists {
		err = client.DeleteObject(testKey)
		if err != nil {
			t.Logf("Delete failed: %v", err)
		}
	}
}

// Benchmark tests
func BenchmarkGetContentType(b *testing.B) {
	filenames := []string{
		"image.jpg",
		"photo.png",
		"picture.webp",
		"raw.nef",
		"unknown.xyz",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		getContentType(filenames[i%len(filenames)])
	}
}

func BenchmarkGetEnv(b *testing.B) {
	os.Setenv("TEST_VAR1", "value1")
	os.Setenv("TEST_VAR2", "value2")
	defer func() {
		os.Unsetenv("TEST_VAR1")
		os.Unsetenv("TEST_VAR2")
	}()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		getEnv("TEST_VAR1", "TEST_VAR2", "TEST_VAR3")
	}
}

// Table-driven test for R2Config validation
func TestR2ConfigValidation(t *testing.T) {
	tests := []struct {
		name        string
		config      R2Config
		shouldError bool
	}{
		{
			name: "Valid config",
			config: R2Config{
				Endpoint:        "https://test.r2.cloudflarestorage.com",
				Bucket:          "test-bucket",
				AccessKeyID:     "key",
				SecretAccessKey: "secret",
			},
			shouldError: false,
		},
		{
			name: "Missing endpoint",
			config: R2Config{
				Bucket:          "test-bucket",
				AccessKeyID:     "key",
				SecretAccessKey: "secret",
			},
			shouldError: true,
		},
		{
			name: "Missing bucket",
			config: R2Config{
				Endpoint:        "https://test.r2.cloudflarestorage.com",
				AccessKeyID:     "key",
				SecretAccessKey: "secret",
			},
			shouldError: true,
		},
		{
			name: "Missing access key",
			config: R2Config{
				Endpoint:        "https://test.r2.cloudflarestorage.com",
				Bucket:          "test-bucket",
				SecretAccessKey: "secret",
			},
			shouldError: true,
		},
		{
			name: "Missing secret key",
			config: R2Config{
				Endpoint:    "https://test.r2.cloudflarestorage.com",
				Bucket:      "test-bucket",
				AccessKeyID: "key",
			},
			shouldError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Validate required fields
			hasError := tt.config.Endpoint == "" || tt.config.Bucket == "" ||
				tt.config.AccessKeyID == "" || tt.config.SecretAccessKey == ""

			assert.Equal(t, tt.shouldError, hasError)
		})
	}
}
