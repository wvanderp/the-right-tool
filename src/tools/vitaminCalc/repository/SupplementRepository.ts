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

  // when true the supplement is ignored in calculations
  disabled?: boolean;
}


class SupplementRepository extends Repository<Supplement[]> {
  constructor() {
    super('supplements', []);
  }

  addSupplement(supplement: Supplement): void {
    // ensure disabled is defined
    if (supplement.disabled === undefined) supplement.disabled = false;
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
    // preserve disabled flag if caller omitted it
    if (supplement.disabled === undefined) {
      supplement.disabled = this.data[index].disabled || false;
    }

    this.data[index] = supplement;
    this.save();
    return true;
  }

  setSupplementDisabled(supplementId: number, disabled: boolean): boolean {
    const index = this.data.findIndex((s) => s.id === supplementId);
    if (index === -1) return false;
    this.data[index].disabled = disabled;
    this.save();
    return true;
  }

  getAllSupplements(): Supplement[] {
    return this.data;
  }
}

export default SupplementRepository;
