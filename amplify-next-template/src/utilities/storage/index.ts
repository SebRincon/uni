import { uploadData, getUrl } from 'aws-amplify/storage';

export const uploadFile = async (file: File) => {
    try {
        const result = await uploadData({
            path: `media/public/${Date.now()}-${file.name}`,
            data: file,
        }).result;
        return result.path;
    } catch (error) {
        console.log('Error uploading file: ', error);
    }
};

export const getStorageUrl = async (path: string) => {
    try {
        const getUrlResult = await getUrl({ path });
        return getUrlResult.url;
    } catch (error) {
        console.log('Error getting file URL: ', error);
    }
};