interface Place {
  id: string;
  name: string;
}

export interface ProviderAddress {
  street: string;
  externalNumber: string;
  internalNumber?: string | null;
  neighborhood: string;
  postalCode: string;
  localityId?: string | null;
  locality?: (Place & { municipality?: Place & { state?: Place & { country?: Place } } }) | null;
}

interface ProviderFields {
  commercialName: string;
  fiscalName: string;
  phoneNumber: string;
  email: string;
  rfc: string;
  contactName: string;
  contactPhone: string;
  notes: string;
  isActive: boolean;
}

export interface Provider extends ProviderFields {
  id: string;
  contactEmail: string;
  address?: ProviderAddress | null;
}

export interface SaveProvider extends ProviderFields {
  contactEmail: string | null;
  street: string;
  externalNumber: string;
  internalNumber: string;
  neighborhood: string;
  postalCode: string;
  localityId: string;
}
