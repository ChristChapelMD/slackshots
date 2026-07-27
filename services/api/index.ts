import * as upload from "./upload/upload";
import * as utilModules from "./db/utils";
import * as slack from "./integrations/slack";
import * as fileModelOperations from "./db/operations/file.operation";
import * as workspaceModelOperations from "./db/operations/workspace.operation";
import * as userWorkspaceModelOperations from "./db/operations/userworkspace.operation";

export const api = {
  slack,
  db: {
    file: fileModelOperations,
    workspace: workspaceModelOperations,
    userworkspace: userWorkspaceModelOperations,
    utils: utilModules,
  },
  upload,
};
