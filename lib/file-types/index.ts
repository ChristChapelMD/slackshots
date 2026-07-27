import { fileTypeRegistry } from "./file-type-registry";
import { ImageHandler } from "./handlers/image-handler";

/**
 * Initialize the file type registry with default handlers
 */
export function initializeFileTypeRegistry() {
  if (!fileTypeRegistry.getHandler("image")) {
    fileTypeRegistry.register(new ImageHandler());
  }
}
