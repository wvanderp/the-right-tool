import Repository from './repository';

export interface Constraint {
    id: number;
    name: string;
    
    max: number;
    target: number;
}

class ConstraintRepository extends Repository<Constraint[]> {
    constructor() {
        super('constraints', []);
    }

    addConstraint(constraint: Constraint): void {
        this.data.push(constraint);
        this.save();
    }

    removeConstraint(constraintId: number): void {
        this.data = this.data.filter((constraint) => constraint.id !== constraintId);
        this.save();
    }

    updateConstraint(constraint: Constraint): boolean {
        const index = this.data.findIndex((c) => c.id === constraint.id);
        if (index === -1) return false;

        this.data[index] = constraint;
        this.save();
        return true;
    }

    getAllConstraints(): Constraint[] {
        return this.data;
    }
}

export type RequirementConstraint = {
    id: number;
    amount: number;
    supplementId: number;
}

export class RequirementRepository extends Repository<RequirementConstraint[]> {
    constructor() {
        super('requirements', []);
    }

    addRequirement(requirement: RequirementConstraint): void {
        this.data.push(requirement);
        this.save();
    }

    removeRequirement(requirementId: number): void {
        this.data = this.data.filter((requirement) => requirement.id !== requirementId);
        this.save();
    }

    updateRequirement(requirement: RequirementConstraint): boolean {
        const index = this.data.findIndex((r) => r.id === requirement.id);
        if (index === -1) return false;

        this.data[index] = requirement;
        this.save();
        return true;
    }

    getAllRequirements(): RequirementConstraint[] {
        return this.data;
    }

    getRequirementById(requirementId: number): RequirementConstraint | undefined {
        return this.data.find((requirement) => requirement.id === requirementId);
    }
}

export default ConstraintRepository;
