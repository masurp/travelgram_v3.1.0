/**
 * Converts a file to a base64 data URL with optimized performance
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use a worker if available for better performance
    if (typeof window !== "undefined" && window.Worker) {
      try {
        const worker = new Worker(
          URL.createObjectURL(
            new Blob(
              [
                `
                self.onmessage = function(e) {
                  const file = e.data;
                  const reader = new FileReader();
                  reader.onload = function() {
                    self.postMessage(reader.result);
                  };
                  reader.onerror = function() {
                    self.postMessage({ error: reader.error });
                  };
                  reader.readAsDataURL(file);
                }
                `,
              ],
              { type: "application/javascript" },
            ),
          ),
        )

        worker.onmessage = (e) => {
          if (e.data.error) {
            reject(e.data.error)
          } else {
            resolve(e.data as string)
          }
          worker.terminate()
        }

        worker.onerror = (e) => {
          reject(e)
          worker.terminate()
        }

        worker.postMessage(file)
      } catch (error) {
        // Fall back to regular FileReader if Worker fails
        fallbackFileToBase64(file, resolve, reject)
      }
    } else {
      // Fall back to regular FileReader if Worker is not available
      fallbackFileToBase64(file, resolve, reject)
    }
  })
}

function fallbackFileToBase64(file: File, resolve: (value: string) => void, reject: (reason?: any) => void) {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => resolve(reader.result as string)
  reader.onerror = (error) => reject(error)
}

/**
 * Validates if a file is an image and within size limits
 */
export function validateImageFile(file: File, maxSizeMB = 5): { valid: boolean; message?: string } {
  // Check if file is an image
  if (!file.type.startsWith("image/")) {
    return { valid: false, message: "File must be an image" }
  }

  // Check file size (default max 5MB)
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return { valid: false, message: `Image must be smaller than ${maxSizeMB}MB` }
  }

  return { valid: true }
}
