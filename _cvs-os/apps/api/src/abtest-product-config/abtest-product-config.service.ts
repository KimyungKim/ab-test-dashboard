import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AbtestProductConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getProductConfig(key: string): Promise<{ productTypes: string[] }> {
    const row = await this.prisma.abTestProductConfig.findUnique({ where: { testKey: key } });
    return { productTypes: row?.productTypes ?? [] };
  }

  async setProductConfig(
    key: string,
    productTypes: string[],
  ): Promise<{ productTypes: string[] }> {
    const row = await this.prisma.abTestProductConfig.upsert({
      where: { testKey: key },
      create: { testKey: key, productTypes: Array.isArray(productTypes) ? productTypes : [] },
      update: { productTypes: Array.isArray(productTypes) ? productTypes : [] },
    });
    return { productTypes: row.productTypes };
  }

  async clearProductConfig(key: string): Promise<void> {
    await this.prisma.abTestProductConfig.deleteMany({ where: { testKey: key } });
  }
}
