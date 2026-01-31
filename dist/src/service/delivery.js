import { PrismaClient } from '@prisma/client';
import { prisma } from '../prisma.js';
export var ExtraDistanceLevel;
(function (ExtraDistanceLevel) {
    ExtraDistanceLevel["near"] = "near";
    ExtraDistanceLevel["medium"] = "medium";
    ExtraDistanceLevel["far"] = "far";
})(ExtraDistanceLevel || (ExtraDistanceLevel = {}));
export class DeliveryServiceImpl {
    // ✅ Create a new delivery location
    async createlocation(location, km) {
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
                    name: location,
                    baseFee: basefee
                }
            });
            return newLocation;
        }
        catch (error) {
            console.error("❌ Error creating location:", error);
            throw new Error("Error creating location");
        }
    }
    // ✅ Get all locations by quary
    async getLocations(query, page = 1, limit = 20) {
        try {
            const whereClause = {
                name: {
                    contains: query,
                    mode: "insensitive" // <-- Case-insensitive filtering
                }
            };
            const [items, total] = await Promise.all([
                prisma.area.findMany({
                    where: whereClause,
                    orderBy: { name: 'asc' },
                    take: limit,
                    skip: (page - 1) * limit,
                }),
                prisma.area.count({ where: whereClause }),
            ]);
            return { items, total };
        }
        catch (error) {
            console.error("❌ Error fetching locations:", error);
            throw new Error("Error fetching locations");
        }
    }
    // async getlocation(): Promise<any> {
    //   try {
    //     return await prisma.area.findMany();
    //   } catch (error) {
    //     console.error("❌ Error fetching locations:", error);
    //     throw new Error("Error fetching locations");
    //   }
    // }
    // ✅ Get one location by ID
    async getlocationbyid(id) {
        try {
            const location = await prisma.area.findUnique({
                where: { id }
            });
            if (!location) {
                throw new Error("Location not found");
            }
            return location;
        }
        catch (error) {
            console.error("❌ Error fetching location by ID:", error);
            throw new Error("Error fetching location");
        }
    }
    // ✅ Delete location
    async deletelocation(id) {
        try {
            const deleted = await prisma.area.delete({
                where: { id }
            });
            return deleted;
        }
        catch (error) {
            console.error("❌ Error deleting location:", error);
            throw new Error("Error deleting location");
        }
    }
    // ✅ Update location
    async updatelocation(id, location, km) {
        try {
            const updated = await prisma.area.update({
                where: { id },
                data: { name: location, baseFee: km * 50 }
            });
            return updated;
        }
        catch (error) {
            console.error("❌ Error updating location:", error);
            throw new Error("Error updating location");
        }
    }
    // ✅ Delivery charge calculation
    // Main logic: baseFee + extraFee based on distance level
    async deliverycharge(location, extra) {
        try {
            const loc = await prisma.area.findUnique({
                where: { id: location }
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
        }
        catch (error) {
            console.error("❌ Error calculating delivery fee:", error);
            throw new Error("Error calculating delivery fee");
        }
    }
}
//# sourceMappingURL=delivery.js.map