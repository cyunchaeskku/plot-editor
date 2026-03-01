import React from 'react';
import { createHashRouter } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import EditorPage from './pages/EditorPage';
import ThreadBoard from './pages/ThreadBoard';

const router = createHashRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <EditorPage /> },
      { path: '/thread', element: <ThreadBoard /> },
    ],
  },
]);

export default router;
