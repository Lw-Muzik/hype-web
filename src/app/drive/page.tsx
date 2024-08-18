// "use client"
// import React, { useState, useEffect } from 'react';
// import { Button, Input, Alert, AlertTitle, AlertDescription } from '../DropboxConnection/ui-components'; // Update the import path as needed

// // You would need to replace these with your actual Google API credentials
// const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
// const API_KEY = 'YOUR_GOOGLE_API_KEY';
// const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
// const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

// interface DriveFile {
//     id: string;
//     name: string;
//     mimeType: string;
//     size?: string;
// }

// const Page: React.FC = () => {
//     const [isConnected, setIsConnected] = useState<boolean>(false);
//     const [files, setFiles] = useState<DriveFile[]>([]);
//     const [folderId, setFolderId] = useState<string>('root');
//     const [error, setError] = useState<string | null>(null);

//     useEffect(() => {
//         loadGoogleApiScript();
//     }, []);

//     const loadGoogleApiScript = () => {
//         const script = document.createElement("script");
//         script.src = "https://apis.google.com/js/api.js";
//         script.onload = initializeGoogleApi;
//         document.body.appendChild(script);
//     };

//     const initializeGoogleApi = () => {
//         window.gapi.load('client:auth2', initClient);
//     };

//     const initClient = () => {
//         window.gapi.client.init({
//             apiKey: API_KEY,
//             clientId: CLIENT_ID,
//             discoveryDocs: DISCOVERY_DOCS,
//             scope: SCOPES
//         }).then(() => {
//             // Listen for sign-in state changes
//             window.gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
//             // Handle the initial sign-in state
//             updateSigninStatus(window.gapi.auth2.getAuthInstance().isSignedIn.get());
//         }, (error: any) => {
//             setError(`Error initializing Google API client: ${JSON.stringify(error)}`);
//         });
//     };

//     const updateSigninStatus = (isSignedIn: boolean) => {
//         setIsConnected(isSignedIn);
//         if (isSignedIn) {
//             listFiles();
//         }
//     };

//     const handleAuthClick = () => {
//         if (window.gapi.auth2.getAuthInstance().isSignedIn.get()) {
//             window.gapi.auth2.getAuthInstance().signOut();
//         } else {
//             window.gapi.auth2.getAuthInstance().signIn();
//         }
//     };

//     const listFiles = (parentId: string = 'root') => {
//         window.gapi.client.drive.files.list({
//             'pageSize': 30,
//             'fields': "files(id, name, mimeType, size)",
//             'q': `'${parentId}' in parents and trashed = false`
//         }).then((response: any) => {
//             const files = response.result.files;
//             setFiles(files);
//             setError(null);
//         }, (error: any) => {
//             setError(`Error fetching files: ${JSON.stringify(error)}`);
//         });
//     };

//     const handleFolderIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setFolderId(e.target.value);
//     };

//     const handleFetchFiles = () => {
//         listFiles(folderId);
//     };

//     return (
//         <div className="container mx-auto p-4">
//             <h1 className="text-2xl font-bold mb-4">Google Drive Connection</h1>

//             <Button onClick={handleAuthClick}>
//                 {isConnected ? 'Sign Out' : 'Connect to Google Drive'}
//             </Button>

//             {isConnected && (
//                 <div className="mt-4">
//                     <Alert variant="success">
//                         <AlertTitle>Connected to Google Drive</AlertTitle>
//                         <AlertDescription>You can now fetch your files.</AlertDescription>
//                     </Alert>

//                     <div className="flex gap-2 mb-4 mt-4">
//                         <Input
//                             type="text"
//                             value={folderId}
//                             onChange={handleFolderIdChange}
//                             placeholder="Enter folder ID (or 'root' for root folder)"
//                         />
//                         <Button onClick={handleFetchFiles}>Fetch Files</Button>
//                     </div>

//                     {error && (
//                         <Alert variant="error">
//                             <AlertTitle>Error</AlertTitle>
//                             <AlertDescription>{error}</AlertDescription>
//                         </Alert>
//                     )}

//                     <h2 className="text-xl font-semibold mb-2 mt-4">Files and Folders:</h2>
//                     <ul className="list-disc pl-5">
//                         {files.map((file) => (
//                             <li key={file.id} className="mb-2">
//                                 {file.name} - {file.mimeType === 'application/vnd.google-apps.folder' ? 'Folder' : 'File'}
//                                 {file.size && ` - ${(parseInt(file.size) / (1024 * 1024)).toFixed(2)} MB`}
//                             </li>
//                         ))}
//                     </ul>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Page;

import React from 'react';

const page = () => {
    return (
        <div>

        </div>
    );
};

export default page;