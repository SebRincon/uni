import { uploadData, getUrl } from 'aws-amplify/storage';

export const uploadFile = async (file: File) => {
    try {
        const result = await uploadData({
            path: `media/${Date.now()}-${file.name}`,
            data: file,
        }).result;
        return result.path;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

export const getStorageUrl = async (path: string) => {
    try {
        const getUrlResult = await getUrl({ path });
        return getUrlResult.url.toString();
    } catch (error) {
        console.error('Error getting URL:', error);
    }
}