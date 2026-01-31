export declare enum ExtraDistanceLevel {
    near = "near",
    medium = "medium",
    far = "far"
}
export interface DeliveryService {
    createlocation(location: string, km: number): Promise<any>;
    getLocations(query: string, page?: number, limit?: number): Promise<{
        items: any[];
        total: number;
    }>;
    getlocationbyid(id: string): Promise<any>;
    deletelocation(id: string): Promise<any>;
    updatelocation(id: string, location: string, km: number): Promise<any>;
    deliverycharge(location: string, extradistance: ExtraDistanceLevel): Promise<any>;
}
export declare class DeliveryServiceImpl implements DeliveryService {
    createlocation(location: string, km: number): Promise<any>;
    getLocations(query: string, page?: number, limit?: number): Promise<{
        items: any[];
        total: number;
    }>;
    getlocationbyid(id: string): Promise<any>;
    deletelocation(id: string): Promise<any>;
    updatelocation(id: string, location: string, km: number): Promise<any>;
    deliverycharge(location: string, extra?: ExtraDistanceLevel): Promise<any>;
}
//# sourceMappingURL=delivery.d.ts.map