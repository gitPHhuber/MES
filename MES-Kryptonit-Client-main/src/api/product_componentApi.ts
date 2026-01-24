import { $product_components_Host } from ".";

// эндпоинты для статуса
export const createStatus = async (title: string) => {
    const { data } = await $product_components_Host.post('api/product_statuses', { title })
    return data;
}
export const fetchStatuses = async () => {
    const { data } = await $product_components_Host.get('api/product_statuses')
    return data
}
export const fetchStatusById = async (id: number) => {
    const { data } = await $product_components_Host.get(`api/product_statuses/${id}`)
    return data
}
export const updateStatus = async (id: number, title: string) => {
    const { data } = await $product_components_Host.put(`api/product_statuses/${id}`, { title })
    return data
}
export const deleteStatus = async (id: number) => {
    const { data } = await $product_components_Host.delete(`api/product_statuses/${id}`)
    return data
}




//эндпоинты для РЕФЕРНСНЫХ комплектующих (компонентов)
export const createComponentRef = async (title: string, article: string, quantity: number) => {
    const { data } = await $product_components_Host.post('api/reference/components', { title, article, quantity })
    return data;
}
export const fetchComponentsRef = async () => {
    const { data } = await $product_components_Host.get('api/reference/components')
    return data;
}
export const fetchComponentRefById = async (id: number) => {
    const { data } = await $product_components_Host.get(`api/reference/components/${id}`)
    return data;
}
export const updateComponentRef = async (id: number, title: string, article: string, quantity: number) => {
    const { data } = await $product_components_Host.put(`api/reference/components/${id}`, { title, article, quantity })
    return data;
}
export const deleteComponentRef = async (id: number) => {
    const { data } = await $product_components_Host.delete(`api/reference/components/${id}`)
    return data;
}

export const updateComponentRefImg = async (id: number, file: FormData) => {
    const { data } = await $product_components_Host.put(`api/component_image/${id}`, file)
    return data
}
export const deleteComponentRefImg = async (id: number) => {
    const { data } = await $product_components_Host.get(`api/component_image/${id}`)
    return data
}

//эндпоинты для комплектующих (компонентов)
export const createComponent = async (title: string, article: string, quantity: number) => {
    const { data } = await $product_components_Host.post('api/components', { title, article, quantity })
    return data;
}
export const fetchComponents = async () => {
    const { data } = await $product_components_Host.get('api/components')
    return data;
}
export const fetchComponentById = async (id: number) => {
    const { data } = await $product_components_Host.get(`api/components/${id}`)
    return data;
}
export const updateComponent = async (id: number, title: string, article: string, quantity: number) => {
    const { data } = await $product_components_Host.put(`api/components/${id}`, { title, article, quantity })
    return data;
}
export const deleteComponent = async (id: number) => {
    const { data } = await $product_components_Host.delete(`api/components/${id}`)
    return data;
}




//эндпоинты для продуктов (изделий)
export const createProduct = async (title: string, status_id: number) => {
    const { data } = await $product_components_Host.post('api/products', { title, status_id })
    return data;
}
export const fetchProducts = async () => {
    const { data } = await $product_components_Host.get('api/products')
    return data;
}
export const fetchProductById = async (id: number) => {
    const { data } = await $product_components_Host.get(`api/products/${id}`)
    return data;
}
export const updateProduct = async (id: number, title: string, status_id: number) => {
    const { data } = await $product_components_Host.put(`api/products/${id}`, { title, status_id })
    return data;
}
export const deleteProduct = async (id: number) => {
    const { data } = await $product_components_Host.delete(`api/products/${id}`)
    return data;
}


//эндпоинты для  референсных продуктов (изделий)
export const createProductReference = async (title: string, status_id: number) => {
    const { data } = await $product_components_Host.post('api/reference/products', { title, status_id })
    return data;
}
export const fetchProductsReference = async () => {
    const { data } = await $product_components_Host.get('api/reference/products')
    return data;
}
export const fetchProductReferenceById = async (id: number) => {
    const { data } = await $product_components_Host.get(`api/reference/products/${id}`)
    return data;
}
export const updateProductReference = async (id: number, title: string, status_id: number) => {
    const { data } = await $product_components_Host.put(`api/reference/products/${id}`, { title, status_id })
    return data;
}
export const deleteProductReference = async (id: number) => {
    const { data } = await $product_components_Host.delete(`api/reference/products/${id}`)
    return data;
}


//эндпоинты для  связи продуктов (изделий) с компонентами (комплектующими)
export const createProd_Comp = async (component_id: number, product_id: number, required_quantity: number) => {
    const { data } = await $product_components_Host.post('api/product_components', { component_id, product_id, required_quantity })
    return data;
}
export const fetchProd_Comp = async (product_id: number | null) => {
    const { data } = await $product_components_Host.get('api/product_components', {
        params: { product_id }
    })
    return data;
}
export const fetchProd_CompById = async (id: number) => {
    const { data } = await $product_components_Host.get(`api/product_components/${id}`)
    return data;
}

export const updateProd_Comp = async (id: number, component_id: number, product_id: number, required_quantity: number) => {
    const { data } = await $product_components_Host.put(`api/product_components/${id}`, { component_id, product_id, required_quantity })
    return data;
}
export const deleteProd_Comp = async (id: number) => {
    const { data } = await $product_components_Host.delete(`api/product_components/${id}`)
    return data;
}
export const deleteProd_Comp_ByProductId = async (product_id: number | null) => {
    const { data } = await $product_components_Host.delete('api/product_components', {
        params: { product_id }
    })
    return data;
}


