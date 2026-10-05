import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DriverModule } from './driver/driver.module';
import { LocationModule } from './location/location.module';
import { RideModule } from './ride/ride.module';
import { WalletModule } from './wallet/wallet.module';
import { FoodModule } from './food/food.module';
import { ChatModule } from './chat/chat.module';
import { AdminModule } from './admin/admin.module';
import { TestingModule } from './testing/testing.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    DriverModule,
    LocationModule,
    RideModule,
    WalletModule,
    FoodModule,
    ChatModule,
    AdminModule,
    TestingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
