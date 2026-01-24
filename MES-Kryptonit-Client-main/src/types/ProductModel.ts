export interface productModel {
    id: number;
    title: string;
    status_id: number;
    createdAt: string;
    updatedAt: string;
    Status: productStatusModel
}

export interface productStatusModel {
    id: number;
    title: string;
    createdAt: string;
    updatedAt: string;
}