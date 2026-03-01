import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import EditorPage from './pages/EditorPage';
import ThreadBoard from './pages/ThreadBoard';

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <EditorPage /> },
      { path: '/thread', element: <ThreadBoard /> },
    ],
  },
]);

export default router;
