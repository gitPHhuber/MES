import { productModel } from "./ProductModel";

export interface componentModel {
    id: number;
    title: string;
    article: string;
    quantity: number;
    image: string;
    createdAt: string;
    updatedAt: string;
}

export interface connectionProduct_ComponentModel {
    id: number;
    product_id: number;
    component_id: number;
    required_quantity: number;
    createdAt: string;
    updatedAt: string;
    Product: productModel;
    Component: componentModel;
}