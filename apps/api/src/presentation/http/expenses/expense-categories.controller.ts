import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Inject,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '@application/common/current-user';
import type { CreateCategoryUseCase } from '@application/expense/use-cases/create-category.usecase';
import type { ListCategoriesUseCase } from '@application/expense/use-cases/list-categories.usecase';
import type { DeleteCategoryUseCase } from '@application/expense/use-cases/delete-category.usecase';
import { CreateCategoryDto } from './dto/create-category.dto';
import { mapResultToResponse } from '../common/result-mapper';
import type { Request } from 'express';

@ApiTags('Expense Categories')
@ApiBearerAuth()
@Controller('expense-categories')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('OWNER')
export class ExpenseCategoriesController {
  constructor(
    @Inject('CREATE_CATEGORY_USE_CASE')
    private readonly createCategory: CreateCategoryUseCase,
    @Inject('LIST_CATEGORIES_USE_CASE')
    private readonly listCategories: ListCategoriesUseCase,
    @Inject('DELETE_CATEGORY_USE_CASE')
    private readonly deleteCategory: DeleteCategoryUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an expense category' })
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.createCategory.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      name: dto.name,
    });
    return mapResultToResponse(result, req, HttpStatus.CREATED);
  }

  @Get()
  @ApiOperation({ summary: 'List expense categories' })
  async list(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const result = await this.listCategories.execute({
      actorUserId: user.userId,
      actorRole: user.role,
    });
    return mapResultToResponse(result, req);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an expense category' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.deleteCategory.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      categoryId: id,
    });
    return mapResultToResponse(result, req);
  }
}
