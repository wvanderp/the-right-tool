export interface DistributionItem {
    name: string;
    weight: number; // Now represents percentage (0-100)
    value?: number;
    isValid?: boolean;
    locked?: boolean;
}

export interface DistributionConfig {
    totalAmount: number;
    items: DistributionItem[];
}
