import { prisma } from '../prisma.js';

export interface SettingsPayload {
  companyName?: string;
  description?: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
}

export class SettingsServiceImpl {
  private readonly settingsKey = 'default';

  async getSettings() {
    return (prisma as any).appSettings.findUnique({
      where: { key: this.settingsKey }
    });
  }

  async getPublicSettings() {
    return this.getSettings();
  }

  async upsertSettings(payload: SettingsPayload) {
    return (prisma as any).appSettings.upsert({
      where: { key: this.settingsKey },
      create: {
        key: this.settingsKey,
        ...payload
      },
      update: {
        ...payload
      }
    });
  }
}
