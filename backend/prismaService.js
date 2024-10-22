const { PrismaClient } = require("@prisma/client");

class PrismaService {
  constructor() {
    if (PrismaService.instance) {
      return PrismaService.instance;
    }
    PrismaService.instance = this;
    this.prisma = new PrismaClient();

    // Add middleware to log connection details
    this.prisma.$use(async (params, next) => {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();
    
        console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
        // You can add more details to log here
        return result;
    });
  }

  async connect() {
    await this.prisma.$connect();
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }

  getClient() {
    return this.prisma;
  }
}

// Export a single instance
const prismaService = new PrismaService();
Object.freeze(prismaService);

module.exports = prismaService;