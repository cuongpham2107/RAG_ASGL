import { useAuthStore } from "../store/auth-store";


const API_URL = process.env.NEXT_PUBLIC_API_URL! || 'http://localhost:8000/api';
const token = useAuthStore.getState().token;

export { API_URL, token };