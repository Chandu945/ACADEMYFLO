import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
import type { CreateExpenseUseCase } from '@application/expense/use-cases/create-expense.usecase';
import type { UpdateExpenseUseCase } from '@application/expense/use-cases/update-expense.usecase';
import type { DeleteExpenseUseCase } from '@application/expense/use-cases/delete-expense.usecase';
import type { ListExpensesUseCase } from '@application/expense/use-cases/list-expenses.usecase';
import type { GetExpenseSummaryUseCase } from '@application/expense/use-cases/get-expense-summary.usecase';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses.query';
import { ExpenseSummaryQueryDto } from './dto/expense-summary.query';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { mapResultToResponse } from '../common/result-mapper';
import type { Request } from 'express';

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('OWNER')
export class ExpensesController {
  constructor(
    @Inject('CREATE_EXPENSE_USE_CASE')
    private readonly createExpense: CreateExpenseUseCase,
    @Inject('UPDATE_EXPENSE_USE_CASE')
    private readonly updateExpense: UpdateExpenseUseCase,
    @Inject('DELETE_EXPENSE_USE_CASE')
    private readonly deleteExpense: DeleteExpenseUseCase,
    @Inject('LIST_EXPENSES_USE_CASE')
    private readonly listExpenses: ListExpensesUseCase,
    @Inject('GET_EXPENSE_SUMMARY_USE_CASE')
    private readonly getExpenseSummary: GetExpenseSummaryUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new expense' })
  async create(
    @Body() dto: CreateExpenseDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.createExpense.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      categoryId: dto.categoryId,
      date: dto.date,
      amount: dto.amount,
      notes: dto.notes ?? null,
    });
    return mapResultToResponse(result, req, HttpStatus.CREATED);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an expense' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.updateExpense.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      expenseId: id,
      categoryId: dto.categoryId,
      date: dto.date,
      amount: dto.amount,
      notes: dto.notes,
    });
    return mapResultToResponse(result, req);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an expense (soft delete)' })
  async remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.deleteExpense.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      expenseId: id,
    });
    return mapResultToResponse(result, req);
  }

  @Get()
  @ApiOperation({ summary: 'List expenses for a month (paginated)' })
  async list(
    @Query() query: ListExpensesQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.listExpenses.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      month: query.month,
      categoryId: query.categoryId,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
    });
    return mapResultToResponse(result, req);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get expense summary by category for a month' })
  async summary(
    @Query() query: ExpenseSummaryQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.getExpenseSummary.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      month: query.month,
    });
    return mapResultToResponse(result, req);
  }
}
