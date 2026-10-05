export class UpdateUserProfileDto {
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  // Notice: Phone number is intentionally omitted and cannot be updated via regular profile endpoint!
}
