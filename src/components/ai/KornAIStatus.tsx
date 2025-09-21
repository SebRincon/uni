// Korn AI Status and Configuration Component
'use client'

import React, { useEffect, useState } from 'react';
import { useKornAIStatus } from '@/hooks/useKornAI';
import { Box, Typography, Chip, IconButton, Tooltip, Alert, Stack } from '@mui/material';
import { 
  SmartToy, 
  Refresh, 
  CheckCircle, 
  Error, 
  Queue,
  Settings 
} from '@mui/icons-material';

interface KornAIStatusProps {
  showDetails?: boolean;
  onConfigClick?: () => void;
}

export const KornAIStatus: React.FC<KornAIStatusProps> = ({ 
  showDetails = false,
  onConfigClick
}) => {
  const { status, checkStatus } = useKornAIStatus();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh status every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(checkStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, checkStatus]);

  // Initial status check
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const getStatusColor = () => {
    if (status.error) return 'error';
    if (!status.initialized) return 'warning';
    return 'success';
  };

  const getStatusText = () => {
    if (status.error) return 'Error';
    if (!status.initialized) return 'Offline';
    return 'Online';
  };

  const getStatusIcon = () => {
    const color = getStatusColor();
    if (color === 'error') return <Error color="error" />;
    if (color === 'warning') return <SmartToy color="warning" />;
    return <CheckCircle color="success" />;
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Status Icon */}
      <Tooltip title={`Korn AI is ${getStatusText().toLowerCase()}`}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {getStatusIcon()}
        </Box>
      </Tooltip>

      {/* Status Chip */}
      <Chip
        size="small"
        label={`@Korn ${getStatusText()}`}
        color={getStatusColor()}
        variant="outlined"
        icon={<SmartToy />}
      />

      {/* Queue Status */}
      {status.queueCount > 0 && (
        <Tooltip title={`${status.queueCount} requests in queue`}>
          <Chip
            size="small"
            label={status.queueCount}
            color="info"
            variant="outlined"
            icon={<Queue />}
          />
        </Tooltip>
      )}

      {/* Refresh Button */}
      <Tooltip title="Refresh status">
        <IconButton size="small" onClick={checkStatus}>
          <Refresh fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Configuration Button */}
      {onConfigClick && (
        <Tooltip title="Configure Korn AI">
          <IconButton size="small" onClick={onConfigClick}>
            <Settings fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {/* Detailed Status */}
      {showDetails && (
        <Box sx={{ ml: 2 }}>
          <Stack spacing={1}>
            {status.error && (
              <Alert severity="error" variant="outlined" sx={{ fontSize: '0.8rem' }}>
                {status.error}
              </Alert>
            )}
            
            {status.lastChecked && (
              <Typography variant="caption" color="text.secondary">
                Last checked: {status.lastChecked.toLocaleTimeString()}
              </Typography>
            )}

            {status.initialized && status.queueCount === 0 && (
              <Typography variant="caption" color="success.main">
                ✓ Ready to respond to @Korn mentions
              </Typography>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

// Compact version for use in headers/navbars
export const KornAIStatusCompact: React.FC = () => {
  const { status } = useKornAIStatus();
  
  return (
    <Tooltip title={`@Korn AI: ${status.initialized ? 'Online' : 'Offline'}`}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <SmartToy 
          fontSize="small" 
          color={status.initialized ? 'success' : 'disabled'}
        />
        <Typography variant="caption" color="text.secondary">
          @Korn
        </Typography>
        {status.queueCount > 0 && (
          <Chip 
            size="small" 
            label={status.queueCount} 
            color="info" 
            sx={{ height: 16, fontSize: '0.7rem' }}
          />
        )}
      </Box>
    </Tooltip>
  );
};

export default KornAIStatus;