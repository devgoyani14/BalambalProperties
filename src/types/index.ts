export interface ParsedQuery {
  filters: {
    districts?: string[];
    propertyTypes?: string[];
    minRent?: number;
    maxRent?: number;
    minArea?: number;
    maxArea?: number;
    floor?: string;
  };
  softPreferences: {
    frontage?: string;
    ceilingHeight?: string;
    loadingAccess?: boolean;
    exhaustFeasibility?: boolean;
    powerSupply?: string;
  };
  businessContext?: string;
  rawIntent: string;
}

export interface SearchParams {
  query?: string;
  districts?: string[];
  propertyTypes?: string[];
  minRent?: number;
  maxRent?: number;
  minArea?: number;
  maxArea?: number;
  fengShuiRated?: boolean;
  minFengShui?: number;
  floor?: string;
  sort?: "relevance" | "price_asc" | "price_desc" | "area_asc" | "area_desc" | "recent";
  page?: number;
  limit?: number;
}

export interface PropertyWithRelations {
  id: string;
  canonicalId: string;
  title: string;
  titleZh: string | null;
  description: string;
  descriptionZh: string | null;
  district: string;
  address: string;
  propertyType: string;
  saleableArea: number | null;
  grossArea: number | null;
  monthlyRent: number | null;
  psfRent: number | null;
  managementFee: number | null;
  price: number | null;
  floor: string | null;
  images: string[];
  floorPlanUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  verificationScore: number;
  status: string;
  engagementScore: number;
  features: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  evidencePack: EvidencePackData | null;
  riskChecks: RiskCheckData[];
  sourceListings: SourceListingData[];
}

export interface EvidencePackData {
  id: string;
  ownershipStatus: string;
  ownershipSource: string | null;
  ownershipDate: Date | null;
  floorPlanStatus: string;
  floorPlanSource: string | null;
  buildingRecordStatus: string;
  buildingRecordSource: string | null;
  tenancyStatus: string;
  tenancyDetail: string | null;
  ubwStatus: string;
  ubwDetail: string | null;
  completionPct: number;
}

export interface RiskCheckData {
  id: string;
  sectorType: string;
  checkName: string;
  status: string;
  confidence: number;
  explanation: string;
  recommendation: string;
  sources: string[];
}

export interface SourceListingData {
  id: string;
  source: string;
  sourceUrl: string | null;
  agentName: string | null;
  agentContact: string | null;
  scrapedAt: Date;
}

export interface UserPreferences {
  businessType: string;
  businessDesc?: string;
  districts?: string[];
  propertyTypes?: string[];
  budgetMin?: number;
  budgetMax?: number;
  areaMin?: number;
  areaMax?: number;
  priorities?: {
    price: number;
    location: number;
    size: number;
    compliance: number;
    condition: number;
  };
}

export interface RiskRubricResult {
  checkName: string;
  status: "pass" | "fail" | "risk" | "unknown";
  confidence: number;
  explanation: string;
  recommendation: string;
  sources: string[];
}

/** Result from AWS Bedrock compliance agent (HK regulatory assessment). */
export interface ComplianceAgentResult {
  summary: string;
  status: "compliant" | "at_risk" | "non_compliant" | "unknown";
  confidence: number;
  regulatoryFlags: string[];
  recommendations: string[];
  references: string[];
}
