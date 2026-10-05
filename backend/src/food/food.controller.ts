import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { FoodService, FoodOrderStatus } from './food.service';
import { CreateFoodOrderDto } from './dto/create-food-order.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';

@Controller('food')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Get('merchants')
  getMerchants() {
    return this.foodService.getMerchants();
  }

  @Get('merchants/:id/menu')
  getMerchantMenu(@Param('id') id: string) {
    return this.foodService.getMerchantMenu(id);
  }

  @Post('orders')
  createFoodOrder(@Body() dto: CreateFoodOrderDto) {
    return this.foodService.createFoodOrder(dto);
  }

  @Post('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body('status') status: FoodOrderStatus) {
    return this.foodService.updateFoodOrderStatus(id, status);
  }

  @Post('delivery')
  createDelivery(@Body() dto: CreateDeliveryDto) {
    return this.foodService.createDelivery(dto);
  }
}
