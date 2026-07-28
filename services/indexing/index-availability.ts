import type mongoose from "mongoose";

import {
  ImageIndex,
  ImageIndexStatus,
} from "@/services/api/db/models/image-index.model";
import dbConnect from "@/services/api/db/connection";
import { DEFAULT_IMAGE_EMBEDDING_VERSION } from "@/services/embeddings/image-embedder";

export async function markImageIndexStale({
  workspaceId,
  fileRecordId,
  errorCode,
}: {
  workspaceId: mongoose.Types.ObjectId;
  fileRecordId: mongoose.Types.ObjectId;
  errorCode: string;
}): Promise<void> {
  await dbConnect();

  await ImageIndex.updateOne(
    {
      workspaceId,
      fileRecordId,
      indexVersion: DEFAULT_IMAGE_EMBEDDING_VERSION,
    },
    {
      $set: {
        status: ImageIndexStatus.STALE,
        errorCode,
      },
      $unset: {
        processingOwner: "",
      },
    },
  );
}
