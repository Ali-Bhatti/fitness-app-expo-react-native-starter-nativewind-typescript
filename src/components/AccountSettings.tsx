import FTCard from '@/components/FTCard'
import AntDesign from '@expo/vector-icons/AntDesign'
import React from 'react'
import { Pressable, Text, View } from 'react-native'

type SettingItem = {
    icon: React.ComponentProps<typeof AntDesign>['name']
    label: string
    iconBg: string
    iconColor: string
}

const SETTINGS_ITEMS: SettingItem[] = [
    { icon: 'edit',             label: 'Edit Profile',   iconBg: '#E0F2FE', iconColor: '#0a7ea4' },
    { icon: 'notification',     label: 'Notifications',  iconBg: '#ECFDF5', iconColor: '#10B981' },
    { icon: 'tool',             label: 'Preferences',    iconBg: '#EDE9FE', iconColor: '#8B5CF6' },
    { icon: 'lock',             label: 'Privacy',        iconBg: '#FFF7ED', iconColor: '#F97316' },
    { icon: 'questioncircleo',  label: 'Help & Support', iconBg: '#FFFBEB', iconColor: '#F59E0B' },
]

function SettingsRow({ icon, label, iconBg, iconColor, isFirst }: SettingItem & { isFirst: boolean }) {
    return (
        <Pressable
            className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-gray-50 ${isFirst ? '' : 'border-t border-gray-100'}`}
        >
            <View className='w-9 h-9 rounded-xl items-center justify-center' style={{ backgroundColor: iconBg }}>
                <AntDesign name={icon} size={16} color={iconColor} />
            </View>
            <Text className='flex-1 text-base font-medium text-gray-800'>{label}</Text>
            <AntDesign name='right' size={14} color='#D1D5DB' />
        </Pressable>
    )
}

export default function AccountSettings() {
    return (
        <View>
            <Text className='text-base font-bold text-gray-900 mb-3'>Account Settings</Text>
            <FTCard className='p-0 overflow-hidden'>
                {SETTINGS_ITEMS.map((item, idx) => (
                    <SettingsRow key={item.label} {...item} isFirst={idx === 0} />
                ))}
            </FTCard>
        </View>
    )
}
