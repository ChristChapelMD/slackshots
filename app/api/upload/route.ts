import { NextRequest, NextResponse } from "next/server";

import {
  AuthorizationError,
  requireWorkspaceAccess,
} from "@/services/api/auth/workspace-access";
import { processAndUpload } from "@/services/api/upload/upload";

export async function POST(request: NextRequest) {
  try {
    const { session, workspace } = await requireWorkspaceAccess(request, true);

    const formData = await request.formData();
    const result = await processAndUpload(
      "slack",
      {
        botToken: workspace.botToken as string,
        workspaceId: workspace._id,
        uploadedBy: {
          userId: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image || undefined,
        },
      },
      formData,
    );

    return NextResponse.json({ data: result.uploadResponseArray });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }
    console.error("[Process Batch API] Error:", error);

    return NextResponse.json(
      { message: (error as Error).message },
      { status: 500 },
    );
  }
}
