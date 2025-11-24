
import { AudienceTargeting } from '../types';

interface PlatformSpec {
  [key: string]: any;
}

const parseAge = (ageRange: string): { min: number, max: number } => {
    // Handle "18-35", "18 to 35", "18+"
    const parts = ageRange.match(/(\d+)/g);
    if (!parts) return { min: 18, max: 65 };
    
    const min = parseInt(parts[0]);
    let max = 65;
    
    if (parts.length > 1) {
        max = parseInt(parts[1]);
    } else if (ageRange.includes('+')) {
        max = 65; // Platform standard for "and above"
    } else {
        max = min + 10; // Fallback width
    }
    
    return { min, max };
};

const mapToMeta = (t: AudienceTargeting, country: string): PlatformSpec => {
  const { min, max } = parseAge(t.ageRange);

  let genders = [1, 2]; // Default all (1=Male, 2=Female in Meta Marketing API)
  if (t.genders.length === 1) {
    const g = t.genders[0].toLowerCase();
    if (g.includes('female') || g.includes('women')) genders = [2];
    else if (g.includes('male') || g.includes('men')) genders = [1];
  }

  return {
    name: "Targeting Spec",
    geo_locations: {
      countries: [country.substring(0, 2).toUpperCase()],
      location_types: ['home', 'recent'],
    },
    age_min: min,
    age_max: max,
    genders: genders,
    flexible_spec: [
      {
        interests: t.interests.map(i => ({ name: i, id: "placeholder_id_needs_lookup" })),
        behaviors: t.behaviors.map(b => ({ name: b, id: "placeholder_id_needs_lookup" })),
      }
    ],
    publisher_platforms: ["facebook", "instagram"],
    facebook_positions: ["feed", "story"],
    instagram_positions: ["stream", "story"],
  };
};

const mapToGoogle = (t: AudienceTargeting, country: string): PlatformSpec => {
  // Google API often uses criterions. This maps to a high level criteria structure.
  return {
    criterion: {
      location: {
        locationName: country,
        displayType: "Country"
      },
      ageRange: {
        // Google uses enum buckets: AGE_RANGE_18_24, AGE_RANGE_25_34, etc.
        // Rule based approximation:
        type: "AGE_RANGE_UNDETERMINED" // In a real app, logic would bucket t.ageRange into enums
      },
      gender: {
        type: t.genders.length > 1 ? "GENDER_UNDETERMINED" : (t.genders[0].toLowerCase().includes('fe') ? "GENDER_FEMALE" : "GENDER_MALE")
      },
      userInterests: t.interests.map(i => ({
        name: i,
        taxonomyType: "AFFINITY",
        status: "ENABLED"
      })),
      userList: {
          name: "Website Visitors (Retargeting)",
          membershipLifeSpan: 30
      }
    }
  };
};

const mapToLinkedIn = (t: AudienceTargeting, country: string): PlatformSpec => {
  return {
    adTargetingSegments: [
      {
        locations: [{ country: country }],
        industries: t.jobTitles ? t.jobTitles.map(j => ({ name: j })) : [],
        seniorities: ["Manager", "Director", "VP", "CXO"], // Inferred generic for bank marketing
        interests: t.interests,
        companySize: ["11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"]
      }
    ]
  };
};

const mapToTikTok = (t: AudienceTargeting, country: string): PlatformSpec => {
    return {
        audience: {
            location_ids: [country], // Placeholder ID
            gender: t.genders.length > 1 ? "UNLIMITED" : (t.genders[0].toLowerCase().includes('fe') ? "FEMALE" : "MALE"),
            age: [t.ageRange], // Pass through for manual mapping or validation
            interest_category_ids: t.interests.map(i => i),
            behavior_categories: t.behaviors.map(b => ({ name: b })),
            operating_systems: ["ANDROID", "IOS"]
        }
    }
}

export const generatePlatformConfigs = (targeting: AudienceTargeting | undefined, channels: string[], country: string): Record<string, any> => {
  if (!targeting) return {};

  const configs: Record<string, any> = {};

  channels.forEach(channel => {
    const c = channel.toLowerCase();
    if (c.includes('facebook') || c.includes('instagram')) {
       configs[channel] = mapToMeta(targeting, country);
    } else if (c.includes('google') || c.includes('youtube') || c.includes('search') || c.includes('display')) {
       configs[channel] = mapToGoogle(targeting, country);
    } else if (c.includes('linkedin')) {
       configs[channel] = mapToLinkedIn(targeting, country);
    } else if (c.includes('tiktok')) {
       configs[channel] = mapToTikTok(targeting, country);
    } else {
        // Fallback generic
        configs[channel] = {
            target: targeting,
            note: "Generic mapping used for unspecified channel."
        };
    }
  });

  return configs;
};
