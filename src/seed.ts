import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';
import { config } from './config';
import { UserRole, UserStatus, TenantPreference, PropertyType, RoomConfig, FurnishingStatus, PropertyStatus, DealStatus } from '@prisma/client';

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Super Admin
  const hashedPassword = await bcrypt.hash(config.superAdmin.password, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: config.superAdmin.email },
    update: {},
    create: {
      email: config.superAdmin.email,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      twoFactorEnabled: true,
    },
  });

  console.log(`✅ Super Admin created/updated: ${superAdmin.email}`);

  // Seed Indian cities
  const cities = [
    { name: 'Mumbai', state: 'Maharashtra' },
    { name: 'Pune', state: 'Maharashtra' },
    { name: 'Bangalore', state: 'Karnataka' },
    { name: 'Hyderabad', state: 'Telangana' },
    { name: 'Chennai', state: 'Tamil Nadu' },
    { name: 'Delhi', state: 'Delhi' },
    { name: 'Noida', state: 'Uttar Pradesh' },
    { name: 'Gurgaon', state: 'Haryana' },
    { name: 'Kolkata', state: 'West Bengal' },
    { name: 'Ahmedabad', state: 'Gujarat' },
    { name: 'Jaipur', state: 'Rajasthan' },
    { name: 'Chandigarh', state: 'Punjab' },
    { name: 'Kochi', state: 'Kerala' },
    { name: 'Indore', state: 'Madhya Pradesh' },
    { name: 'Lucknow', state: 'Uttar Pradesh' },
  ];

  for (const city of cities) {
    await prisma.city.upsert({
      where: { name: city.name },
      update: {},
      create: { name: city.name, state: city.state },
    });
  }

  console.log(`✅ ${cities.length} cities seeded`);

  // Create multiple demo owners
  const ownerPassword = await bcrypt.hash('Owner@123', 12);
  const tenantPassword = await bcrypt.hash('Tenant@123', 12);

  const owners = [
    { email: 'owner@demo.com', firstName: 'Rajesh', lastName: 'Sharma', phone: '9876543210' },
    { email: 'priya.owner@demo.com', firstName: 'Priya', lastName: 'Patel', phone: '9876543211' },
    { email: 'amit.owner@demo.com', firstName: 'Amit', lastName: 'Kumar', phone: '9876543212' },
    { email: 'sunita.owner@demo.com', firstName: 'Sunita', lastName: 'Reddy', phone: '9876543213' },
    { email: 'vikram.owner@demo.com', firstName: 'Vikram', lastName: 'Singh', phone: '9876543214' },
    { email: 'meera.owner@demo.com', firstName: 'Meera', lastName: 'Nair', phone: '9876543215' },
  ];

  const createdOwners: any[] = [];
  for (const owner of owners) {
    const created = await prisma.user.upsert({
      where: { email: owner.email },
      update: {},
      create: {
        ...owner,
        password: ownerPassword,
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
      },
    });
    createdOwners.push(created);
  }

  console.log(`✅ ${owners.length} demo owners created`);

  // Create multiple demo tenants
  const tenants = [
    { email: 'tenant@demo.com', firstName: 'Arjun', lastName: 'Menon', phone: '9898989801' },
    { email: 'sneha.tenant@demo.com', firstName: 'Sneha', lastName: 'Gupta', phone: '9898989802' },
    { email: 'rahul.tenant@demo.com', firstName: 'Rahul', lastName: 'Verma', phone: '9898989803' },
    { email: 'ananya.tenant@demo.com', firstName: 'Ananya', lastName: 'Iyer', phone: '9898989804' },
    { email: 'karan.tenant@demo.com', firstName: 'Karan', lastName: 'Malhotra', phone: '9898989805' },
    { email: 'divya.tenant@demo.com', firstName: 'Divya', lastName: 'Joshi', phone: '9898989806' },
    { email: 'sanjay.tenant@demo.com', firstName: 'Sanjay', lastName: 'Pillai', phone: '9898989807' },
    { email: 'pooja.tenant@demo.com', firstName: 'Pooja', lastName: 'Agarwal', phone: '9898989808' },
  ];

  const createdTenants: any[] = [];
  for (const tenant of tenants) {
    const created = await prisma.user.upsert({
      where: { email: tenant.email },
      update: {},
      create: {
        ...tenant,
        password: tenantPassword,
        role: UserRole.TENANT,
        status: UserStatus.ACTIVE,
      },
    });
    createdTenants.push(created);
  }

  console.log(`✅ ${tenants.length} demo tenants created`);

  // High-quality property images from Unsplash (real estate focused)
  const propertyImages = {
    luxury: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80',
    ],
    modern: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
      'https://images.unsplash.com/photo-1560185127-6a8c4e1c7d5e?w=800&q=80',
    ],
    cozy: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
      'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80',
    ],
    apartment: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
      'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800&q=80',
      'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&q=80',
      'https://images.unsplash.com/photo-1560448075-cbc16bb4af8e?w=800&q=80',
    ],
    house: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
      'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
    ],
    pg: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
      'https://images.unsplash.com/photo-1626178793926-22b28830aa30?w=800&q=80',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80',
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80',
    ],
    living: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
      'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=800&q=80',
      'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80',
    ],
    bedroom: [
      'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80',
      'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=800&q=80',
      'https://images.unsplash.com/photo-1560185008-a28b5d0e4d92?w=800&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80',
    ],
    kitchen: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
      'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80',
      'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&q=80',
      'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=800&q=80',
    ],
  };

  // Extensive property data with correct enum values
  const properties = [
    // Bangalore Properties
    {
      ownerId: createdOwners[0].id,
      title: 'Luxurious 3BHK Penthouse in Indiranagar',
      description: 'Stunning penthouse with panoramic city views in the heart of Indiranagar. Features include Italian marble flooring, modular kitchen with Bosch appliances, private terrace garden, home automation system, and dedicated parking. Walking distance to 100 Feet Road with premium restaurants and shopping. Perfect for executives and families seeking luxury living.',
      city: 'Bangalore',
      locality: 'Indiranagar',
      address: 'Embassy Pristine, 100 Feet Road, Indiranagar',
      pincode: '560038',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.THREE_BHK,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 85000,
      depositAmount: 500000,
      maintenanceAmount: 8000,
      tenantPreference: [TenantPreference.WORKING_PROFESSIONALS, TenantPreference.FAMILY],
      amenities: ['Wifi', 'AC', 'Geyser', 'Parking', 'Power Backup', 'Security', 'Gym', 'Swimming Pool', 'Club House', 'Garden', 'Lift', 'Intercom'],
      images: [propertyImages.luxury[0], propertyImages.living[0], propertyImages.bedroom[0], propertyImages.kitchen[0]],
      squareFeet: 2200,
      bathrooms: 3,
      balconies: 2,
      floorNumber: 15,
      totalFloors: 15,
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[0].id,
      title: 'Spacious 2BHK in Koramangala 4th Block',
      description: 'Well-maintained 2BHK apartment in prime Koramangala location. Close to Forum Mall, major tech parks (Sony, Flipkart), and metro station. Fully furnished with modern amenities including split ACs, washing machine, and microwave. Ideal for IT professionals or small families.',
      city: 'Bangalore',
      locality: 'Koramangala',
      address: '123, 4th Block, Koramangala',
      pincode: '560034',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.TWO_BHK,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 42000,
      depositAmount: 150000,
      maintenanceAmount: 4000,
      tenantPreference: [TenantPreference.WORKING_PROFESSIONALS, TenantPreference.FAMILY],
      amenities: ['Wifi', 'AC', 'Geyser', 'Parking', 'Power Backup', 'Security', 'Lift', 'Gym'],
      images: [propertyImages.modern[0], propertyImages.modern[1], propertyImages.bedroom[1], propertyImages.kitchen[1]],
      squareFeet: 1200,
      bathrooms: 2,
      balconies: 1,
      floorNumber: 3,
      totalFloors: 7,
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[1].id,
      title: 'Premium 1BHK Studio in HSR Layout',
      description: 'Modern studio apartment perfect for bachelors or couples. Located in HSR Layout Sector 2, close to Agara Lake and major tech companies. Features modular kitchen, premium bathroom fittings, and high-speed internet connectivity. Gated community with 24/7 security.',
      city: 'Bangalore',
      locality: 'HSR Layout',
      address: 'Sobha Dream Acres, Sector 2, HSR Layout',
      pincode: '560102',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.ONE_BHK,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 25000,
      depositAmount: 75000,
      maintenanceAmount: 2500,
      tenantPreference: [TenantPreference.WORKING_PROFESSIONALS],
      amenities: ['Wifi', 'AC', 'Geyser', 'Parking', 'Power Backup', 'Security', 'Gym', 'Jogging Track'],
      images: [propertyImages.cozy[0], propertyImages.cozy[1], propertyImages.kitchen[2]],
      squareFeet: 650,
      bathrooms: 1,
      balconies: 1,
      floorNumber: 8,
      totalFloors: 12,
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[1].id,
      title: 'Affordable PG for Men in Electronic City',
      description: 'Comfortable PG accommodation in Electronic City Phase 1. Includes home-cooked meals (breakfast & dinner), high-speed wifi, housekeeping, and laundry. Both single and shared occupancy available. Shuttle service to nearby tech parks. Ideal for freshers and working professionals.',
      city: 'Bangalore',
      locality: 'Electronic City',
      address: 'Near Infosys Gate 1, Electronic City Phase 1',
      pincode: '560100',
      propertyType: PropertyType.PG,
      roomConfig: RoomConfig.SHARED,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 9500,
      depositAmount: 19000,
      tenantPreference: [TenantPreference.WORKING_PROFESSIONALS, TenantPreference.STUDENTS],
      amenities: ['Wifi', 'Meals', 'Laundry', 'Housekeeping', 'AC', 'TV', 'Shuttle'],
      images: [propertyImages.pg[0], propertyImages.pg[1]],
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[2].id,
      title: 'Executive 2BHK in Whitefield',
      description: 'Premium apartment in Prestige Shantiniketan, Whitefield. Overlooking beautiful landscaped gardens. Close to ITPL, Phoenix Marketcity, and international schools. Comes with premium furniture, 2 covered parking spaces, and access to world-class amenities.',
      city: 'Bangalore',
      locality: 'Whitefield',
      address: 'Prestige Shantiniketan, ITPL Main Road',
      pincode: '560048',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.TWO_BHK,
      furnishing: FurnishingStatus.SEMI_FURNISHED,
      rentAmount: 38000,
      depositAmount: 200000,
      maintenanceAmount: 5500,
      tenantPreference: [TenantPreference.FAMILY, TenantPreference.WORKING_PROFESSIONALS],
      amenities: ['Parking', 'Power Backup', 'Security', 'Gym', 'Swimming Pool', 'Club House', 'Tennis Court', 'Jogging Track', 'Kids Play Area'],
      images: [propertyImages.apartment[0], propertyImages.apartment[1], propertyImages.living[1]],
      squareFeet: 1350,
      bathrooms: 2,
      balconies: 2,
      floorNumber: 6,
      totalFloors: 18,
      status: PropertyStatus.ACTIVE,
    },

    // Mumbai Properties
    {
      ownerId: createdOwners[2].id,
      title: 'Sea-View 3BHK in Worli',
      description: 'Breathtaking sea-facing apartment in one of Mumbai\'s most prestigious addresses. Features include floor-to-ceiling windows, premium wooden flooring, designer bathroom fittings, and a state-of-the-art kitchen. Building amenities include infinity pool, spa, and concierge services.',
      city: 'Mumbai',
      locality: 'Worli',
      address: 'Lodha World Crest, Annie Besant Road',
      pincode: '400018',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.THREE_BHK,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 250000,
      depositAmount: 1500000,
      maintenanceAmount: 25000,
      tenantPreference: [TenantPreference.FAMILY, TenantPreference.WORKING_PROFESSIONALS],
      amenities: ['Wifi', 'AC', 'Parking', 'Power Backup', 'Security', 'Gym', 'Swimming Pool', 'Spa', 'Concierge', 'Sea View', 'Lift'],
      images: [propertyImages.luxury[1], propertyImages.luxury[2], propertyImages.living[2], propertyImages.bedroom[2]],
      squareFeet: 2800,
      bathrooms: 4,
      balconies: 2,
      floorNumber: 42,
      totalFloors: 55,
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[3].id,
      title: 'Modern 1BHK in Powai',
      description: 'Brand new 1BHK apartment in Hiranandani Gardens with lake view. Semi-furnished with modular kitchen. Walking distance to IIT Bombay, Powai Lake, and Hiranandani shopping complex. Excellent connectivity via Eastern Express Highway.',
      city: 'Mumbai',
      locality: 'Powai',
      address: '78, Hiranandani Gardens, Powai',
      pincode: '400076',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.ONE_BHK,
      furnishing: FurnishingStatus.SEMI_FURNISHED,
      rentAmount: 35000,
      depositAmount: 105000,
      maintenanceAmount: 3500,
      tenantPreference: [TenantPreference.ANY],
      amenities: ['Gym', 'Swimming Pool', 'Parking', 'Security', 'Club House', 'Lake View', 'Garden'],
      images: [propertyImages.apartment[2], propertyImages.apartment[3], propertyImages.kitchen[3]],
      squareFeet: 700,
      bathrooms: 1,
      balconies: 1,
      floorNumber: 12,
      totalFloors: 20,
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[3].id,
      title: 'Compact 2BHK in Andheri West',
      description: 'Well-connected 2BHK near Andheri Metro Station. Perfect for professionals working in Andheri-Goregaon belt. Close to Infiniti Mall and DN Nagar. Semi-furnished with wardrobes and kitchen cabinets. Society has gym and garden.',
      city: 'Mumbai',
      locality: 'Andheri West',
      address: 'Lokhandwala Complex, Andheri West',
      pincode: '400053',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.TWO_BHK,
      furnishing: FurnishingStatus.SEMI_FURNISHED,
      rentAmount: 55000,
      depositAmount: 165000,
      maintenanceAmount: 4000,
      tenantPreference: [TenantPreference.FAMILY, TenantPreference.WORKING_PROFESSIONALS],
      amenities: ['Parking', 'Security', 'Gym', 'Garden', 'Lift', 'Power Backup'],
      images: [propertyImages.modern[2], propertyImages.modern[3], propertyImages.bedroom[3]],
      squareFeet: 900,
      bathrooms: 2,
      balconies: 1,
      floorNumber: 4,
      totalFloors: 7,
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[4].id,
      title: 'Budget-Friendly PG for Women in Bandra',
      description: 'Safe and comfortable PG for working women in Bandra East. Includes meals, wifi, and housekeeping. Near Bandra-Kurla Complex (BKC) and Bandra Station. AC rooms available at additional cost. No curfew for working professionals.',
      city: 'Mumbai',
      locality: 'Bandra',
      address: 'Near Kalanagar, Bandra East',
      pincode: '400051',
      propertyType: PropertyType.PG,
      roomConfig: RoomConfig.SHARED,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 15000,
      depositAmount: 30000,
      tenantPreference: [TenantPreference.WORKING_PROFESSIONALS],
      amenities: ['Wifi', 'Meals', 'Laundry', 'Housekeeping', 'CCTV', 'Warden'],
      images: [propertyImages.pg[2], propertyImages.pg[3]],
      status: PropertyStatus.ACTIVE,
    },

    // Pune Properties
    {
      ownerId: createdOwners[4].id,
      title: 'Premium 3BHK Independent House in Koregaon Park',
      description: 'Stunning independent house in Pune\'s most upscale neighborhood. Features private garden, car porch for 2 cars, servant quarters, and rooftop terrace. Walking distance to Osho Ashram and German Bakery. Ideal for expats and senior executives.',
      city: 'Pune',
      locality: 'Koregaon Park',
      address: 'Lane 6, Koregaon Park',
      pincode: '411001',
      propertyType: PropertyType.INDEPENDENT_HOUSE,
      roomConfig: RoomConfig.THREE_BHK,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 95000,
      depositAmount: 500000,
      maintenanceAmount: 5000,
      tenantPreference: [TenantPreference.FAMILY, TenantPreference.WORKING_PROFESSIONALS],
      amenities: ['Wifi', 'AC', 'Geyser', 'Parking', 'Power Backup', 'Security', 'Garden', 'Terrace', 'Servant Quarter'],
      images: [propertyImages.house[0], propertyImages.house[1], propertyImages.living[3], propertyImages.kitchen[0]],
      squareFeet: 3000,
      bathrooms: 4,
      balconies: 2,
      floorNumber: 0,
      totalFloors: 2,
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[5].id,
      title: 'Tech Park Adjacent 2BHK in Hinjewadi',
      description: 'Perfect for IT professionals! Brand new 2BHK in Godrej Infinity, just 5 minutes from Rajiv Gandhi IT Park. Fully furnished with premium furniture, split ACs in all rooms, and high-speed fiber internet. Excellent amenities and 24/7 security.',
      city: 'Pune',
      locality: 'Hinjewadi',
      address: 'Godrej Infinity, Phase 2, Hinjewadi',
      pincode: '411057',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.TWO_BHK,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 32000,
      depositAmount: 100000,
      maintenanceAmount: 3500,
      tenantPreference: [TenantPreference.WORKING_PROFESSIONALS],
      amenities: ['Wifi', 'AC', 'Geyser', 'Parking', 'Power Backup', 'Security', 'Gym', 'Swimming Pool', 'Club House'],
      images: [propertyImages.modern[0], propertyImages.bedroom[0], propertyImages.living[0]],
      squareFeet: 1100,
      bathrooms: 2,
      balconies: 1,
      floorNumber: 10,
      totalFloors: 15,
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[5].id,
      title: 'Student-Friendly PG near Symbiosis',
      description: 'Affordable PG accommodation near Symbiosis and other colleges in Viman Nagar. Includes all meals, wifi, and regular cleaning. Study room and common area available. Both boys and girls PG available in separate buildings.',
      city: 'Pune',
      locality: 'Viman Nagar',
      address: 'Near Symbiosis College, Viman Nagar',
      pincode: '411014',
      propertyType: PropertyType.PG,
      roomConfig: RoomConfig.SHARED,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 8500,
      depositAmount: 17000,
      tenantPreference: [TenantPreference.STUDENTS, TenantPreference.WORKING_PROFESSIONALS],
      amenities: ['Wifi', 'Meals', 'Laundry', 'Housekeeping', 'Study Room', 'TV'],
      images: [propertyImages.pg[0], propertyImages.pg[1]],
      status: PropertyStatus.ACTIVE,
    },

    // Hyderabad Properties
    {
      ownerId: createdOwners[0].id,
      title: 'Luxurious 3BHK+ in Jubilee Hills',
      description: 'Opulent 4BHK apartment in the prestigious Jubilee Hills. Sprawling living spaces, Italian marble throughout, home theater room, and stunning city views. Building features include valet parking, concierge, and rooftop infinity pool.',
      city: 'Hyderabad',
      locality: 'Jubilee Hills',
      address: 'My Home Bhooja, Road No. 10, Jubilee Hills',
      pincode: '500033',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.THREE_PLUS_BHK,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 150000,
      depositAmount: 1000000,
      maintenanceAmount: 15000,
      tenantPreference: [TenantPreference.FAMILY],
      amenities: ['Wifi', 'AC', 'Parking', 'Power Backup', 'Security', 'Gym', 'Swimming Pool', 'Home Theater', 'Concierge', 'Valet'],
      images: [propertyImages.luxury[2], propertyImages.luxury[3], propertyImages.living[1], propertyImages.bedroom[1]],
      squareFeet: 4500,
      bathrooms: 5,
      balconies: 3,
      floorNumber: 22,
      totalFloors: 30,
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[1].id,
      title: 'Modern 2BHK in Gachibowli',
      description: 'Contemporary 2BHK in DLF Cyber City. Perfect for techies working in Gachibowli IT corridor. Features modular kitchen, wooden flooring in bedrooms, and video door phone. Excellent connectivity to ORR and metro.',
      city: 'Hyderabad',
      locality: 'Gachibowli',
      address: 'DLF Cyber City, Gachibowli',
      pincode: '500032',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.TWO_BHK,
      furnishing: FurnishingStatus.SEMI_FURNISHED,
      rentAmount: 28000,
      depositAmount: 84000,
      maintenanceAmount: 3000,
      tenantPreference: [TenantPreference.WORKING_PROFESSIONALS, TenantPreference.FAMILY],
      amenities: ['Parking', 'Power Backup', 'Security', 'Gym', 'Swimming Pool', 'Lift', 'Intercom'],
      images: [propertyImages.apartment[0], propertyImages.apartment[1], propertyImages.kitchen[1]],
      squareFeet: 1150,
      bathrooms: 2,
      balconies: 1,
      floorNumber: 8,
      totalFloors: 14,
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[2].id,
      title: 'Budget 1BHK in Kondapur',
      description: 'Affordable 1BHK for bachelors and young professionals. Located in Kondapur near Botanical Garden. Semi-furnished with basic amenities. Good water supply and power backup. Close to shopping centers and restaurants.',
      city: 'Hyderabad',
      locality: 'Kondapur',
      address: 'Near Botanical Garden, Kondapur',
      pincode: '500084',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.ONE_BHK,
      furnishing: FurnishingStatus.UNFURNISHED,
      rentAmount: 12000,
      depositAmount: 50000,
      maintenanceAmount: 1500,
      tenantPreference: [TenantPreference.WORKING_PROFESSIONALS],
      amenities: ['Parking', 'Power Backup', 'Security', 'Lift'],
      images: [propertyImages.cozy[2], propertyImages.cozy[3]],
      squareFeet: 550,
      bathrooms: 1,
      balconies: 1,
      floorNumber: 3,
      totalFloors: 5,
      status: PropertyStatus.ACTIVE,
    },

    // Delhi NCR Properties
    {
      ownerId: createdOwners[3].id,
      title: 'Premium 3BHK in Gurugram Golf Course Road',
      description: 'Ultra-luxury apartment on Golf Course Road with stunning golf course views. Features include imported marble, Gaggenau kitchen appliances, walk-in closets, and smart home automation. World-class amenities including spa, squash courts, and infinity pool.',
      city: 'Gurgaon',
      locality: 'Golf Course Road',
      address: 'DLF The Camellias, Golf Course Road',
      pincode: '122002',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.THREE_BHK,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 200000,
      depositAmount: 1200000,
      maintenanceAmount: 20000,
      tenantPreference: [TenantPreference.FAMILY, TenantPreference.WORKING_PROFESSIONALS],
      amenities: ['Wifi', 'AC', 'Parking', 'Power Backup', 'Security', 'Gym', 'Swimming Pool', 'Spa', 'Squash Court', 'Concierge', 'Smart Home'],
      images: [propertyImages.luxury[0], propertyImages.luxury[1], propertyImages.living[2], propertyImages.bedroom[2]],
      squareFeet: 3500,
      bathrooms: 4,
      balconies: 2,
      floorNumber: 18,
      totalFloors: 25,
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[4].id,
      title: 'Affordable 2BHK in Noida Sector 62',
      description: 'Well-maintained 2BHK in Sector 62, close to Noida Electronic City Metro. Ideal for professionals working in Noida IT sector. Semi-furnished with wardrobes and ACs. Gated society with good security and parking.',
      city: 'Noida',
      locality: 'Sector 62',
      address: 'ATS Greens, Sector 62',
      pincode: '201301',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.TWO_BHK,
      furnishing: FurnishingStatus.SEMI_FURNISHED,
      rentAmount: 22000,
      depositAmount: 66000,
      maintenanceAmount: 2500,
      tenantPreference: [TenantPreference.FAMILY, TenantPreference.WORKING_PROFESSIONALS],
      amenities: ['Parking', 'Power Backup', 'Security', 'Gym', 'Club House', 'Lift', 'Garden'],
      images: [propertyImages.modern[2], propertyImages.modern[3], propertyImages.bedroom[3]],
      squareFeet: 1050,
      bathrooms: 2,
      balconies: 2,
      floorNumber: 11,
      totalFloors: 18,
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[5].id,
      title: 'Cozy 1RK in Greater Kailash',
      description: 'Compact 1RK perfect for students or single professionals. Located in GK-1, close to GK metro station and M Block Market. Fully furnished with bed, wardrobe, kitchenette, and attached bathroom. Quiet neighborhood with good connectivity.',
      city: 'Delhi',
      locality: 'Greater Kailash',
      address: 'GK-1, M Block',
      pincode: '110048',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.ONE_RK,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 18000,
      depositAmount: 54000,
      tenantPreference: [TenantPreference.STUDENTS],
      amenities: ['Wifi', 'AC', 'Geyser', 'Power Backup'],
      images: [propertyImages.cozy[0], propertyImages.cozy[1]],
      squareFeet: 350,
      bathrooms: 1,
      balconies: 0,
      floorNumber: 2,
      totalFloors: 3,
      status: PropertyStatus.ACTIVE,
    },

    // Chennai Properties
    {
      ownerId: createdOwners[0].id,
      title: 'Sea-Facing 2BHK in ECR',
      description: 'Beautiful apartment with direct beach access on East Coast Road. Wake up to stunning sunrise views over the Bay of Bengal. Features include wooden flooring, modular kitchen, and spacious balcony facing the sea. Perfect weekend getaway or permanent residence.',
      city: 'Chennai',
      locality: 'ECR',
      address: 'Besant Nagar Beach Road',
      pincode: '600090',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.TWO_BHK,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 45000,
      depositAmount: 200000,
      maintenanceAmount: 4500,
      tenantPreference: [TenantPreference.FAMILY, TenantPreference.WORKING_PROFESSIONALS],
      amenities: ['Wifi', 'AC', 'Geyser', 'Parking', 'Power Backup', 'Security', 'Beach Access', 'Sea View'],
      images: [propertyImages.luxury[3], propertyImages.living[3], propertyImages.bedroom[0]],
      squareFeet: 1300,
      bathrooms: 2,
      balconies: 2,
      floorNumber: 6,
      totalFloors: 8,
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[1].id,
      title: 'IT Corridor 2BHK in OMR',
      description: 'Modern apartment in Navalur, heart of Chennai\'s IT corridor. Close to TCS, Infosys, and Cognizant campuses. Fully furnished with quality furniture and appliances. Excellent connectivity via OMR and upcoming metro line.',
      city: 'Chennai',
      locality: 'OMR',
      address: 'Casagrand First City, Navalur',
      pincode: '600130',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.TWO_BHK,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 28000,
      depositAmount: 84000,
      maintenanceAmount: 3000,
      tenantPreference: [TenantPreference.WORKING_PROFESSIONALS, TenantPreference.FAMILY],
      amenities: ['Wifi', 'AC', 'Geyser', 'Parking', 'Power Backup', 'Security', 'Gym', 'Swimming Pool', 'Club House'],
      images: [propertyImages.apartment[2], propertyImages.apartment[3], propertyImages.kitchen[2]],
      squareFeet: 1100,
      bathrooms: 2,
      balconies: 1,
      floorNumber: 7,
      totalFloors: 12,
      status: PropertyStatus.ACTIVE,
    },

    // More variety - Rented property
    {
      ownerId: createdOwners[2].id,
      title: 'Premium 2BHK in Baner',
      description: 'Stylish 2BHK in Baner, Pune. Close to Westend Mall and IT parks. This property has been rented to a happy tenant through RentDirect!',
      city: 'Pune',
      locality: 'Baner',
      address: 'Lodha Belmondo, Baner',
      pincode: '411045',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.TWO_BHK,
      furnishing: FurnishingStatus.FULLY_FURNISHED,
      rentAmount: 35000,
      depositAmount: 105000,
      maintenanceAmount: 3500,
      tenantPreference: [TenantPreference.WORKING_PROFESSIONALS, TenantPreference.FAMILY],
      amenities: ['Wifi', 'AC', 'Parking', 'Security', 'Gym', 'Swimming Pool'],
      images: [propertyImages.modern[1], propertyImages.living[1]],
      squareFeet: 1050,
      bathrooms: 2,
      balconies: 1,
      floorNumber: 5,
      totalFloors: 10,
      status: PropertyStatus.RENTED,
    },
    {
      ownerId: createdOwners[3].id,
      title: 'Spacious 3BHK in Magarpatta',
      description: 'Large 3BHK in Magarpatta City. Currently in draft mode - being prepared for listing.',
      city: 'Pune',
      locality: 'Magarpatta',
      address: 'Neco Skypark, Magarpatta City',
      pincode: '411028',
      propertyType: PropertyType.FLAT,
      roomConfig: RoomConfig.THREE_BHK,
      furnishing: FurnishingStatus.SEMI_FURNISHED,
      rentAmount: 42000,
      depositAmount: 150000,
      maintenanceAmount: 4500,
      tenantPreference: [TenantPreference.FAMILY],
      amenities: ['Parking', 'Security', 'Gym', 'Swimming Pool', 'Club House', 'Garden'],
      images: [propertyImages.apartment[0], propertyImages.apartment[1]],
      squareFeet: 1600,
      bathrooms: 3,
      balconies: 2,
      floorNumber: 8,
      totalFloors: 15,
      status: PropertyStatus.DRAFT,
    },

    // Independent Houses
    {
      ownerId: createdOwners[4].id,
      title: 'Independent House in JP Nagar',
      description: 'Charming independent house in JP Nagar 7th Phase. Ground floor with private garden and parking for 2 cars. 3 bedrooms, modern kitchen, and servant room. Quiet residential area with good schools nearby.',
      city: 'Bangalore',
      locality: 'JP Nagar',
      address: '7th Phase, JP Nagar',
      pincode: '560078',
      propertyType: PropertyType.INDEPENDENT_HOUSE,
      roomConfig: RoomConfig.THREE_BHK,
      furnishing: FurnishingStatus.UNFURNISHED,
      rentAmount: 55000,
      depositAmount: 300000,
      maintenanceAmount: 0,
      tenantPreference: [TenantPreference.FAMILY],
      amenities: ['Parking', 'Garden', 'Servant Quarter', 'Power Backup'],
      images: [propertyImages.house[2], propertyImages.house[3], propertyImages.living[0]],
      squareFeet: 2000,
      bathrooms: 3,
      balconies: 0,
      floorNumber: 0,
      totalFloors: 1,
      status: PropertyStatus.ACTIVE,
    },
    {
      ownerId: createdOwners[5].id,
      title: 'Row House in Aundh',
      description: 'Beautiful 3BHK row house in Aundh, Pune. Spacious living area, private terrace, and attached garden. Close to Bremen Chowk and Aundh market. Pet-friendly property with plenty of outdoor space.',
      city: 'Pune',
      locality: 'Aundh',
      address: 'Near Bremen Chowk, Aundh',
      pincode: '411007',
      propertyType: PropertyType.INDEPENDENT_HOUSE,
      roomConfig: RoomConfig.THREE_BHK,
      furnishing: FurnishingStatus.SEMI_FURNISHED,
      rentAmount: 48000,
      depositAmount: 200000,
      maintenanceAmount: 2000,
      tenantPreference: [TenantPreference.FAMILY],
      amenities: ['Parking', 'Garden', 'Terrace', 'Power Backup', 'Pet Friendly'],
      images: [propertyImages.house[0], propertyImages.house[1], propertyImages.living[2]],
      squareFeet: 1800,
      bathrooms: 3,
      balconies: 1,
      floorNumber: 0,
      totalFloors: 2,
      status: PropertyStatus.ACTIVE,
    },
  ];

  console.log(`📦 Creating ${properties.length} properties...`);

  const createdProperties: any[] = [];
  for (const propertyData of properties) {
    const property = await prisma.property.create({
      data: propertyData,
    });
    createdProperties.push(property);
  }

  console.log(`✅ ${properties.length} properties created`);

  // Create some sample conversations
  console.log('💬 Creating sample conversations...');

  const conversations = [
    {
      propertyId: createdProperties[0].id, // Luxurious 3BHK in Indiranagar
      tenantId: createdTenants[0].id,
      ownerId: createdOwners[0].id,
    },
    {
      propertyId: createdProperties[1].id, // 2BHK in Koramangala
      tenantId: createdTenants[1].id,
      ownerId: createdOwners[0].id,
    },
    {
      propertyId: createdProperties[5].id, // Sea-View 3BHK in Worli
      tenantId: createdTenants[2].id,
      ownerId: createdOwners[2].id,
    },
  ];

  for (const conv of conversations) {
    const conversation = await prisma.conversation.create({
      data: conv,
    });

    // Add sample messages
    const messages = [
      {
        conversationId: conversation.id,
        senderId: conv.tenantId,
        content: 'Hi, I am interested in this property. Is it still available?',
      },
      {
        conversationId: conversation.id,
        senderId: conv.ownerId,
        content: 'Yes, the property is available! Would you like to schedule a visit?',
      },
      {
        conversationId: conversation.id,
        senderId: conv.tenantId,
        content: 'That would be great! I am available this weekend. What time works for you?',
      },
      {
        conversationId: conversation.id,
        senderId: conv.ownerId,
        content: 'Saturday at 11 AM works for me. I will send you the exact location details.',
      },
    ];

    for (const msg of messages) {
      await prisma.message.create({
        data: msg,
      });
    }

    // Update conversation with last message
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
  }

  console.log(`✅ ${conversations.length} conversations with messages created`);

  // Create a conversation for the rented property and then a deal
  console.log('🤝 Creating sample deals...');

  const rentedConversation = await prisma.conversation.create({
    data: {
      propertyId: createdProperties[21].id, // Rented property in Baner
      tenantId: createdTenants[3].id,
      ownerId: createdOwners[2].id,
    },
  });

  await prisma.deal.create({
    data: {
      propertyId: createdProperties[21].id,
      ownerId: createdOwners[2].id,
      tenantId: createdTenants[3].id,
      conversationId: rentedConversation.id,
      agreedRent: 35000,
      successFeeAmount: 499,
      status: DealStatus.COMPLETED,
      ownerConfirmed: true,
      tenantConfirmed: true,
      ownerConfirmedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      tenantConfirmedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      paymentStatus: 'PAID',
    },
  });

  console.log('✅ Sample deal created');

  // Add some bookmarks
  console.log('📌 Creating sample bookmarks...');

  const bookmarks = [
    { userId: createdTenants[0].id, propertyId: createdProperties[0].id },
    { userId: createdTenants[0].id, propertyId: createdProperties[5].id },
    { userId: createdTenants[0].id, propertyId: createdProperties[10].id },
    { userId: createdTenants[1].id, propertyId: createdProperties[1].id },
    { userId: createdTenants[1].id, propertyId: createdProperties[6].id },
    { userId: createdTenants[2].id, propertyId: createdProperties[15].id },
  ];

  for (const bookmark of bookmarks) {
    await prisma.bookmark.create({
      data: bookmark,
    });
  }

  console.log(`✅ ${bookmarks.length} bookmarks created`);

  // Update property view counts for realism
  console.log('👁️ Adding property view counts...');

  for (const property of createdProperties) {
    await prisma.property.update({
      where: { id: property.id },
      data: {
        viewCount: Math.floor(Math.random() * 500) + 50,
      },
    });
  }

  console.log('✅ View counts updated');

  console.log('\n🎉 Database seeding completed!');
  console.log('\n📝 Demo Credentials:');
  console.log(`   Super Admin: ${config.superAdmin.email} / ${config.superAdmin.password}`);
  console.log('\n   Owners (Password: Owner@123):');
  owners.forEach(o => console.log(`   - ${o.email} (${o.firstName} ${o.lastName})`));
  console.log('\n   Tenants (Password: Tenant@123):');
  tenants.forEach(t => console.log(`   - ${t.email} (${t.firstName} ${t.lastName})`));
  console.log(`\n📊 Data Summary:`);
  console.log(`   - ${cities.length} cities`);
  console.log(`   - ${owners.length} owners`);
  console.log(`   - ${tenants.length} tenants`);
  console.log(`   - ${properties.length} properties`);
  console.log(`   - ${conversations.length} conversations with messages`);
  console.log(`   - 1 completed deal`);
  console.log(`   - ${bookmarks.length} bookmarks`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
