export interface MedicalCondition {
	condition: string;
	severity?: string;
	diagnosedAt?: string;
}

export interface MedicalVital {
	type: string;
	value: string;
	recordedAt: string;
}

export interface MedicalMedication {
	name: string;
	dosage?: string;
	frequency?: string;
}

export interface MedicalAllergy {
	substance: string;
	reaction?: string;
}

export interface MedicalData {
	status: 'active' | 'not_onboarded';
	userId: string;
	updatedAt: string;
	demographics: {
		dateOfBirth?: string;
		sex?: string;
		height?: string;
		weight?: string;
		bloodType?: string;
	};
	vitals: MedicalVital[];
	currentConditions: MedicalCondition[];
	persistentConditions: MedicalCondition[];
	medications: MedicalMedication[];
	allergies: MedicalAllergy[];
}
