export interface LoginFormProps {
    onSubmit: (username: string, password: string) => void;
}

export interface LoginFormState {
    username: string;
    password: string;
    errorMessage?: string;
}

export type CloudinarySignatureResponse = {
    timestamp: number;
    signature: string;
    apiKey: string;
    cloudName: string;
    uploadPreset?: string;
    folder?: string;
};

export type UserProfile = {
    id: string;
    username: string;
    email: string;
    role: string;
    registerDate: string;
    avatar?: {
        url: string;
        publicId: string;
        folder?: string;
        width?: number;
        height?: number;
        bytes?: number;
        format?: string;
        updatedAt: string;
    };
};