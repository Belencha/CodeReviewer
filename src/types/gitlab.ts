export interface GitLabWebhookEvent {
  object_kind: string;
  object_attributes: MergeRequestAttributes;
  project: Project;
  repository: Repository;
  user: User;
  changes?: {
    [key: string]: {
      previous: any;
      current: any;
    };
  };
}

export interface MergeRequestAttributes {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: string;
  action: string;
  source_branch: string;
  target_branch: string;
  source: Project;
  target: Project;
  last_commit: Commit;
  url: string;
  diff_refs: {
    base_sha: string;
    head_sha: string;
    start_sha: string;
  };
}

export interface Project {
  id: number;
  name: string;
  path_with_namespace: string;
  default_branch: string;
  web_url: string;
}

export interface Repository {
  name: string;
  url: string;
  description: string;
  homepage: string;
}

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
}

export interface Commit {
  id: string;
  message: string;
  timestamp: string;
  url: string;
  author: {
    name: string;
    email: string;
  };
}

export interface Diff {
  old_path: string;
  new_path: string;
  a_mode: string;
  b_mode: string;
  diff: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
}

export interface DiscussionNote {
  id: number;
  body: string;
  author: User;
  created_at: string;
  position?: {
    base_sha: string;
    start_sha: string;
    head_sha: string;
    old_path: string;
    new_path: string;
    position_type: string;
    new_line: number;
  };
}

