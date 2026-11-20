import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cinema } from './cinema.entity';
import { CinemasController } from './cinemas.controller';
import { CinemasService } from './cinemas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cinema])],
  controllers: [CinemasController],
  providers: [CinemasService],
})
export class CinemasModule {}
