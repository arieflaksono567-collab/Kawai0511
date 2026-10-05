import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthService, UserEntity } from '../auth/auth.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly authService: AuthService) {}

  async getProfile(userId: string): Promise<UserEntity> {
    const user = await this.authService.getMe(userId);
    if (!user) {
      throw new NotFoundException('Profil pengguna tidak ditemukan');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto): Promise<UserEntity> {
    const user = await this.authService.getMe(userId);
    if (!user) {
      throw new NotFoundException('Profil pengguna tidak ditemukan');
    }

    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.email) user.email = dto.email;
    if (dto.avatarUrl) user.avatarUrl = dto.avatarUrl;
    user.updatedAt = new Date().toISOString();

    return user;
  }
}
