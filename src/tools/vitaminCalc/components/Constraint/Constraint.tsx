import React from 'react';
import { Constraint } from '../../repository/ConstraintRepository';

interface ConstraintProps {
  constraint: Constraint;
}

function ConstraintComponent({ constraint }: ConstraintProps) {
    return (
        <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">{constraint.name}</h3>
            <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Target Amount:</span>
                    <span className="font-medium text-gray-900">{constraint.target}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Maximum Amount:</span>
                    <span className="font-medium text-gray-900">{constraint.max}</span>
                </div>
            </div>
        </div>
    );
}

export default ConstraintComponent;
