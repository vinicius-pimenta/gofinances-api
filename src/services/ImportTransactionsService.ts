import csvParse from 'csv-parse';
import fs from 'fs';
import { In, getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(path: string): Promise<Transaction[]> {
    const transactionReadStream = fs.createReadStream(path);

    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getRepository(Transaction);

    const parsers = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const transactions: CSVTransaction[] = [];

    const categories = new Set<string>();

    const parseCsv = transactionReadStream.pipe(parsers);

    parseCsv.on('data', async line => {
      const [title, type, value, category] = line;

      if (!title || !type || !value) return;

      categories.add(category);

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCsv.on('end', resolve));

    const categoriesFromFile = Array.from(categories);

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categoriesFromFile),
      },
    });

    const titles = existentCategories.map((cat: Category) => cat.title);

    const categoriesToSave = categoriesFromFile.filter(
      item => !titles.includes(item),
    );

    const dbObjects = categoriesRepository.create(
      categoriesToSave.map(item => ({ title: item })),
    );

    await categoriesRepository.save(dbObjects);

    const finalCategories = [...existentCategories, ...dbObjects];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          cat => cat.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    fs.promises.unlink(path);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
