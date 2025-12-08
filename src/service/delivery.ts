import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();



export enum ExtraDistanceLevel {
  near = 'near',
  medium = 'medium',
  far = 'far',
}
export interface DeliveryService {
    createlocation(location: string , km: number): Promise<any>;
    getlocation(): Promise<any>;
    getlocationbyid(id: string): Promise<any>;
    deletelocation(id: string): Promise<any>;
    updatelocation(id: string, location: string, km: number): Promise<any>;
    deliverycharge(location:string , extradistance: ExtraDistanceLevel): Promise<any>;
} 




export class DeliveryServiceImpl implements DeliveryService {

  // ✅ Create a new delivery location
  async createlocation(location: string, km: number): Promise<any> {
    try {
    /*   const existing = await prisma.area.findFirst({
        where: { name:location }
      });

      if (existing) {
        throw new Error("Location already exists");
      } */

     const basefee = km * 50;

      const newLocation = await prisma.area.create({
        data: {
          name:location,
          baseFee: basefee
        }
      });

      return newLocation;

    } catch (error) {
      console.error("❌ Error creating location:", error);
      throw new Error("Error creating location");
    }
  }

  // ✅ Get all locations
  async getlocation(): Promise<any> {
    try {
      return await prisma.area.findMany();
    } catch (error) {
      console.error("❌ Error fetching locations:", error);
      throw new Error("Error fetching locations");
    }
  }

  // ✅ Get one location by ID
  async getlocationbyid(id: string): Promise<any> {
    try {
      const location = await prisma.area.findUnique({
        where: { id }
      });

      if (!location) {
        throw new Error("Location not found");
      }

      return location;

    } catch (error) {
      console.error("❌ Error fetching location by ID:", error);
      throw new Error("Error fetching location");
    }
  }

  // ✅ Delete location
  async deletelocation(id: string): Promise<any> {
    try {
      const deleted = await prisma.area.delete({
        where: { id }
      });

      return deleted;

    } catch (error) {
      console.error("❌ Error deleting location:", error);
      throw new Error("Error deleting location");
    }
  }

  // ✅ Update location
  async updatelocation(id: string, location: string, km: number): Promise<any> {
    try {

    
      const updated = await prisma.area.update({
        where: { id },
        data: { name:location, baseFee: km * 50 }
      });

      return updated;

    } catch (error) {
      console.error("❌ Error updating location:", error);
      throw new Error("Error updating location");
    }
  }

  // ✅ Delivery charge calculation
  // Main logic: baseFee + extraFee based on distance level
  async deliverycharge(location: string, extra?: ExtraDistanceLevel): Promise<any> {
    try {
      const loc = await prisma.area.findUnique({
        where: { id:location }
      });

      if (!loc) {
        throw new Error("Location not found");
      }

      let extraCharge = 0;

      switch (extra) {
        case ExtraDistanceLevel.near:
          extraCharge = 20;
          break;

        case ExtraDistanceLevel.medium:
          extraCharge = 40;
          break;

        case ExtraDistanceLevel.far:
          extraCharge = 60;
          break;

        default:
          extraCharge = 0;
      }

      const totalFee = loc.baseFee + extraCharge;

      return {
        location: loc.name,
        extraFee: extraCharge,
        extraDistance: extra,
        totalFee
      };

    } catch (error) {
      console.error("❌ Error calculating delivery fee:", error);
      throw new Error("Error calculating delivery fee");
    }
  }
}
