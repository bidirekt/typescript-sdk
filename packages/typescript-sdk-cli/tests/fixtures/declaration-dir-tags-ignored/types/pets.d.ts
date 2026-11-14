/** @bidirekt schema name=PetStatus */
export declare enum Status {
    Available = "available",
    Sold = "sold"
}
/**
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200 PetStatus
 * @bidirekt response 404
 */
export declare function findPet(): Status;
/**
 * @bidirekt consumes payments_api POST /charges
 * @bidirekt response 201
 */
export declare const createCharge: () => Promise<void>;
