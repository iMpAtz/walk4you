export interface LoginFormProps {
    onSubmit: (username: string, password: string) => void;
}

export interface LoginFormState {
    username: string;
    password: string;
    errorMessage?: string;
}