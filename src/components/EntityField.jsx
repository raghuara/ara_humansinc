import React from 'react';
import { Box, Typography, Stack, TextField, MenuItem, Divider } from '@mui/material';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import { useSelector, useDispatch } from 'react-redux';
import { selectEntities, selectActiveEntityId, setActiveEntity, ALL_ENTITY_ID } from '../redux/slices/orgSlice';
import { field } from './uiKit';

// ── Entity field ────────────────────────────────────────────────────────────
// The one way to choose which company you are working in. Business Entities is
// only a master (create / edit / remove); every screen that actually needs an
// entity — departments, designations, documents — puts this field on the page
// and reads the choice from it.
//
// The selection is held in Redux, so moving between those screens keeps you in
// the same company instead of resetting to the first one each time.
//
// `allowAll` adds an "All Entities" choice (value ALL_ENTITY_ID = "all"), used
// on list screens that can show every entity's records at once. It's off for
// forms that must file a record under one specific entity.
export default function EntityField({ label = 'Entity', width = 240, height = 42, allowAll = false }) {
    const dispatch = useDispatch();
    const entities = useSelector(selectEntities);
    const activeId = useSelector(selectActiveEntityId);

    if (entities.length === 0) {
        return (
            <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', height, px: 1.6, borderRadius: '7px', border: '1px dashed #E5E7EB', bgcolor: '#F8FAFC' }}>
                <ApartmentRoundedIcon sx={{ fontSize: 17, color: '#94A3B8' }} />
                <Typography sx={{ fontSize: 12.5, color: '#98A0AE' }}>No entities — create one first</Typography>
            </Stack>
        );
    }

    return (
        <TextField
            select
            size="small"
            label={label}
            value={activeId || ''}
            onChange={(e) => dispatch(setActiveEntity(e.target.value))}
            sx={{ ...field, width, '& .MuiOutlinedInput-root': { ...field['& .MuiOutlinedInput-root'], height, bgcolor: '#fff' } }}
            slotProps={{ inputLabel: { shrink: true } }}
        >
            {allowAll && (
                <MenuItem value={ALL_ENTITY_ID} sx={{ py: 0.9 }}>
                    <Stack direction="row" spacing={1.1} sx={{ alignItems: 'center', minWidth: 0 }}>
                        <Box sx={{ width: 24, height: 24, borderRadius: '6px', bgcolor: '#EEF0F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <LayersRoundedIcon sx={{ fontSize: 15, color: '#64748B' }} />
                        </Box>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }} noWrap>All Entities</Typography>
                    </Stack>
                </MenuItem>
            )}
            {allowAll && <Divider sx={{ my: 0.5 }} />}
            {entities.map((ent) => (
                <MenuItem key={ent.id} value={ent.id} sx={{ py: 0.9 }}>
                    <Stack direction="row" spacing={1.1} sx={{ alignItems: 'center', minWidth: 0 }}>
                        <Box sx={{ width: 24, height: 24, borderRadius: '6px', bgcolor: ent.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Typography sx={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{ent.code.slice(0, 3)}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }} noWrap>{ent.name}</Typography>
                    </Stack>
                </MenuItem>
            ))}
        </TextField>
    );
}
