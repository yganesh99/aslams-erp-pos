import axios from 'axios';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
export const apiOrigin = apiBaseUrl?.replace(/\/api\/?$/, '');

const api = axios.create({
	baseURL: apiBaseUrl,
	headers: {
		'Content-Type': 'application/json',
	},
	withCredentials: true,
});

export default api;
