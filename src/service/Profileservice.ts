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
    userid : string;
    phone: string;
    address: string;
}

export interface userprofileservice {
    createprofile(user: userprofileDTO): Promise<userprofile>;
    getprofileById(id: number): Promise<userprofile | null>;
    updateprofile(id: number, data: Partial<Omit<userprofile, 'id' | 'createdAt' | 'updatedAt'>>): Promise<userprofile | null>;
    deleteprofile(id: number): Promise<boolean>;

}

export class userprofileserviceimpl implements userprofileservice {
    async createprofile(user: userprofileDTO): Promise<userprofile> {


        // Implementation for creating a user profile
        throw new Error("Method not implemented.");
    }
    async getprofileById(id: number): Promise<userprofile | null> {
        // Implementation for retrieving a user profile by ID
        throw new Error("Method not implemented.");
    }
    async updateprofile(id: number, data: Partial<Omit<userprofile, 'id' | 'createdAt' | 'updatedAt'>>): Promise<userprofile | null> {
        // Implementation for updating a user profile
        throw new Error("Method not implemented.");
    }
    async deleteprofile(id: number): Promise<boolean> {
        // Implementation for deleting a user profile
        throw new Error("Method not implemented.");
    }
}