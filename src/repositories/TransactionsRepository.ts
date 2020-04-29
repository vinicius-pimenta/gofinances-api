import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    let sumValuesTypeIncome = 0;
    let sumValuesTypeOutcome = 0;
    let total = 0;

    const transactions = await this.find();

    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        sumValuesTypeIncome += transaction.value;
      } else {
        sumValuesTypeOutcome += transaction.value;
      }
    });

    total = sumValuesTypeIncome - sumValuesTypeOutcome;

    const balance = {
      income: sumValuesTypeIncome,
      outcome: sumValuesTypeOutcome,
      total,
    };

    return balance;
  }
}

export default TransactionsRepository;
