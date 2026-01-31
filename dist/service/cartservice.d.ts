export interface CartItem {
    productId: string;
    quantity: number;
    packagingsize: number;
}
export interface Cartorder {
    id: string;
    quantity: number;
    packagingSize: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CartService {
    preloadCartOnLogin(userId: string): Promise<any>;
    fetchProductsFromCacheOrDb(productIds: string[]): Promise<any>;
    addToCart(userId: string, item: CartItem): Promise<void>;
    updateCartItemQuantity(userId: string, productId: string, packaging: number, quantity: number): Promise<void>;
    removeItemFromCart(cartId: string): Promise<void>;
    getCartItems(userId: string): Promise<any>;
    clearCart(userId: string): Promise<void>;
}
export declare class CartServiceImpl implements CartService {
    private calculateItemPrice;
    preloadCartOnLogin(userId: string): Promise<any>;
    fetchProductsFromCacheOrDb(productIds: string[]): Promise<any>;
    addToCart(userId: string, item: CartItem): Promise<void>;
    updateCartItemQuantity(userId: string, productId: string, packagingSize: number, quantity: number): Promise<void>;
    updateCartItem(userId: string, cartId: string, newProductId?: string, newPackaging?: number, newQuantity?: number): Promise<void>;
    removeItemFromCart(cartid: string): Promise<void>;
    getCartItems(userId: string): Promise<any>;
    clearCart(userId: string): Promise<void>;
}
//# sourceMappingURL=cartservice.d.ts.map