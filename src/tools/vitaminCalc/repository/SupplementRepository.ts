import Repository from './repository';

interface Ingredient {
    name: string;
    amount: number; // mg
}

export interface Supplement {
    id: number;
    name: string;
    maker: string;

    image?: string;

    ingredients: Ingredient[];
}


class SupplementRepository extends Repository<Supplement[]> {
    constructor() {
      super('supplements', []);
    }
  
    addSupplement(supplement: Supplement): void {
      this.data.push(supplement);
      this.save();
    }

    removeSupplement(supplementId: number): void {
      this.data = this.data.filter((supplement) => supplement.id !== supplementId);
      this.save();
    }

    updateSupplement(supplement: Supplement): boolean {
      const index = this.data.findIndex((s) => s.id === supplement.id);
      if (index === -1) return false;
      
      this.data[index] = supplement;
      this.save();
      return true;
    }

    getAllSupplements(): Supplement[] {
      return this.data;
    }    
  }
  
  export default SupplementRepository;
