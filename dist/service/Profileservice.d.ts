export interface userprofile {
    id: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface userprofileDTO {
    userid: string;
    phone: string;
    address: string;
}
export interface userprofileservice {
    createprofile(user: userprofileDTO): Promise<userprofile>;
    getprofileById(id: number): Promise<userprofile | null>;
    updateprofile(id: number, data: Partial<Omit<userprofile, 'id' | 'createdAt' | 'updatedAt'>>): Promise<userprofile | null>;
    deleteprofile(id: number): Promise<boolean>;
}
export declare class userprofileserviceimpl implements userprofileservice {
    createprofile(user: userprofileDTO): Promise<userprofile>;
    getprofileById(id: number): Promise<userprofile | null>;
    updateprofile(id: number, data: Partial<Omit<userprofile, 'id' | 'createdAt' | 'updatedAt'>>): Promise<userprofile | null>;
    deleteprofile(id: number): Promise<boolean>;
}
//# sourceMappingURL=Profileservice.d.ts.map