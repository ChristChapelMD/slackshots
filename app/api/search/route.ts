import { NextRequest, NextResponse } from "next/server";

import {
  AuthorizationError,
  requireWorkspaceAccess,
} from "@/services/api/auth/workspace-access";
import { HttpTextEmbedder } from "@/services/embeddings/http-text-embedder";
import { MongoImageVectorIndex } from "@/services/search/mongo-image-vector-index";
import { searchImages } from "@/services/search/search-images";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 500;

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await requireWorkspaceAccess(request, false);
    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get("q") ?? "").trim();
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        Number.parseInt(searchParams.get("limit") ?? `${DEFAULT_LIMIT}`, 10) ||
          DEFAULT_LIMIT,
      ),
    );

    if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        {
          error: `Search queries must be between ${MIN_QUERY_LENGTH} and ${MAX_QUERY_LENGTH} characters.`,
        },
        { status: 400 },
      );
    }

    const result = await searchImages(
      {
        workspaceId: workspace._id,
        query,
        limit,
      },
      new HttpTextEmbedder(),
      new MongoImageVectorIndex(),
    );

    return NextResponse.json({
      query,
      backend: result.backend,
      results: result.files.map((file) => ({
        _id: file._id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        uploadedBy: file.uploadedBy,
        uploads: file.uploads.map((upload) => ({
          provider: upload.provider,
          providerFileId: upload.providerFileId,
        })),
        metadata: file.metadata,
        createdAt: file.createdAt,
        score: file.score,
      })),
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (
      error instanceof Error &&
      error.message === "The local embedding service is unavailable."
    ) {
      return NextResponse.json(
        { error: "Search is starting. Try again in a moment." },
        { status: 503 },
      );
    }

    console.error("[Semantic Search API] Error:", error);

    return NextResponse.json(
      { error: "Semantic search is temporarily unavailable." },
      { status: 500 },
    );
  }
}
