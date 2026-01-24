import { makeAutoObservable } from "mobx"
import { componentModel, connectionProduct_ComponentModel } from "src/types/ComponentModel"
import { productModel, productStatusModel } from "src/types/ProductModel"


export default class ProductStore {

    private _referencesProducts: productModel[] | null = null
    private _selectedProduct: productModel | null = null
    private _products: productModel[] | null = null
    private _components: componentModel[] | null = null
    private _referencesComponents: componentModel[] | null = null
    private _productStatus: productStatusModel[] | null = null
    private _connectionProduct_Component: connectionProduct_ComponentModel[] | null = null


    constructor() {
        makeAutoObservable(this)   // здесь мобикс следит за изменениями этих переменных, принимает контекст текущего класса
    }

    setReferencesProducts(referencesProducts: productModel[]) {
        this._referencesProducts = referencesProducts
    }
    setSelectedProduct(selectedProduct: productModel) {
        this._selectedProduct = selectedProduct
    }

    setProducts(products: productModel[]) {
        this._products = products
    }
    setComponents(components: componentModel[]) {
        this._components = components
    }
    setReferencesComponents(components: componentModel[]) {
        this._referencesComponents = components
    }
    setProductStatus(productStatus: productStatusModel[]) {
        this._productStatus = productStatus
    }
    setConnectionProduct_Component(connectionProduct_Component: connectionProduct_ComponentModel[]) {
        this._connectionProduct_Component = connectionProduct_Component
    }

    get referencesProducts() {
        return this._referencesProducts
    }
    get selectedProduct() {
        return this._selectedProduct
    }

    get products() {
        return this._products
    }
    get components() {
        return this._components
    }
    get referencesComponents() {
        return this._referencesComponents
    }
    get productStatus() {
        return this._productStatus
    }
    get connectionProduct_Component() {
        return this._connectionProduct_Component
    }
}